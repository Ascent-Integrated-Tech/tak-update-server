import express from "express";
import fileUpload from 'express-fileupload';
import { PackageManager } from "./PackageManager";
import { PackageModel } from "./DB/PackageModel";
import { IPackage } from "./DB/Interfaces";
import fb from "fs";
import fs from "fs/promises";
import useragent from 'express-useragent';
import path from "path";

const TOKEN = process.env.ACCESS_TOKEN ?? '';

export class HttpServer {
    private static _instance: HttpServer;
    logFile = path.join(__dirname, 's.log');
    app = express();

    constructor() {
        this.app.use(fileUpload({
            useTempFiles: true,
        }));
        this.app.use(useragent.express());
    }

    start() {
        this.addRoutes();
        this.app.listen(8019);
    }

    logRequest(req: express.Request) {
        const logMessage = `[HTTPServer] ${req.headers['x-real-ip'] ?? req.ip} ${req.method} ${req.url}\n` +
            `[HEADERS] ${JSON.stringify(req.headers, null, 2)}\n` +
            `[User-Agent] ${JSON.stringify(req.useragent, null, 2)}\n\n`;

        fb.appendFileSync(this.logFile, logMessage);
    }

    addRoutes() {
        this.app.all('*', (req, res, next) => {
            console.log('[HTTPServer] ' + (req.headers['x-real-ip'] ?? req.ip) + ' ' + req.method + ' ' + req.url);
            this.logRequest(req);
            next();
        });

        // this.app.use('/product.infz', express.static(PackageManager.UPDATE_FILE));

        this.app.use('/:device/product.infz', (req, res, next) => {
            const device = req.params.device.toUpperCase();
            const filePath = PackageManager.UPDATE_FILE[device.toUpperCase()];

            if (filePath) {
                res.sendFile(path.resolve(filePath), (err) => {
                    if (err) {
                        next(err);
                    }
                });
            } else {
                res.status(404).send('File not found');
            }
        });

        // this.app.get('/:device/apk/:appId/latest', async (req, res) => {
        //     let appId = req.params.appId ?? '';
        //     res.redirect('/apk/' + appId + '/latest');
        // });

        this.app.get('/:device/apk/:appId/latest', async (req, res) => {
            let appId = req.params.appId ?? '';
            let device = req.params.device ?? '';

            if (typeof appId !== 'string' || appId === '') {
                res.status(404).end();
                return;
            }

            let pkg = await PackageModel.getByAppId(appId, device.toUpperCase());

            if (pkg === null) {
                res.status(404).end();
                return;
            }

            res.redirect(`/${device.toUpperCase()}/apk/` + pkg.app_id + '-' + pkg.version_code.toString(10) + '.apk');
        });

        // this.app.get('/:device/apk/:appId-:version.apk', async (req, res) => {
        //     let appId = req.params.appId ?? '';
        //     let version = req.params.version ?? '';
        //     res.redirect(`/apk/${appId}-${version}.apk`);
        // });

        this.app.get('/:device/apk/:appId-:version.apk', async (req, res) => {
            let appId = req.params.appId ?? '';
            let device = req.params.device ?? '';

            if (typeof appId !== 'string' || appId === '') {
                res.status(404).end();
                return;
            }

            let pkg = await PackageModel.getByAppId(appId, device.toUpperCase());

            if (pkg === null) {
                res.status(404).end();
                return;
            }

            res.sendFile(PackageManager.STORAGE_DIR[device.toUpperCase()] + '/' + pkg.package_id + '.apk', { root: '.' }, () => {
                res.status(404).end();
            });
        });

        this.app.get('/icon/:appId.png', async (req, res) => {
            // Assuming app icon is the same for different devices
            let appId = req.params.appId ?? '';
            let devices = await PackageModel.getDevices(appId);
            console.log(devices);
            if (!devices) {
                res.status(404).end();
                return;
            }
            res.redirect(`/${devices[0]}/icon/${appId}.png`);
        })

        this.app.get('/:device/icon/:appId.png', async (req, res) => {
            let appId = req.params.appId ?? '';
            let device = req.params.device ?? '';

            if (typeof appId !== 'string' || appId === '') {
                res.status(404).end();
                return;
            }

            let pkg = await PackageModel.getByAppId(appId, device.toUpperCase());

            if (pkg === null) {
                res.status(404).end();
                return;
            }

            res.contentType('image/png');
            res.send(pkg.image);
        });

        this.app.get('/manage', (async (req, res) => {
            if (req.query.token !== TOKEN) {
                res.status(404).end();
                return;
            }
            let txt = '';

            txt += '<table border=1><tr><th></th><th>Device</th><th>Name</th><th>AppID</th><th>Version</th><th>Description</th></tr>';
            let packages = await PackageModel.getAll_();

            for (let p of packages) {
                txt += '<tr><td><img src="/icon/' + p.app_id + '.png" height="24"></td> <td>' + p.device + '</td> <td>' + p.name + ' (' + p.type + ')</td><td><a href="' + HttpServer.getAPKUrl(p.device, p) + '">' + p.app_id + '</a></td><td>' + p.version + ' (' + p.version_code.toString(10) + ')</td><td>' + p.description + '</td></tr>';
            }

            txt += '</table>';
            txt += '<br>';
            txt += '<br>';


            txt += `
            <form method="POST" action="/TAB/upload?token=${TOKEN}" enctype="multipart/form-data" id="uploadForm">
                <label for="device">Target Hardware:</label>
                <select name="device" id="device">
                    <option value="TAB">Tablet</option>
                    <option value="PHN">Phone</option>
                </select>
                <input type="file" name="plugin">
                <input type="submit" value="Upload">
            </form>
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    var form = document.getElementById('uploadForm');
                    var deviceSelect = document.getElementById('device');
                    
                    // Set initial form action based on the default selected value
                    form.action = '/' + deviceSelect.value + '/upload?token=${TOKEN}';
                    
                    // Update form action on device selection change
                    deviceSelect.addEventListener('change', function() {
                        form.action = '/' + this.value + '/upload?token=${TOKEN}';
                    });
                });
            </script>
            `;

            res.send(txt);
        }));

        this.app.post('/:device/upload', (async (req, res) => {
            if (req.query.token !== TOKEN) {
                res.status(404).end();
                return;
            }

            const device = req.params.device.toUpperCase();
            if (req.files !== undefined && req.files !== null && req.files.plugin !== undefined && !Array.isArray(req.files.plugin)) {
                await PackageManager.Instance.importFile(device, req.files.plugin.tempFilePath);
                await fs.unlink(req.files.plugin.tempFilePath);
            }
            res.redirect('/manage?token=' + TOKEN);
        }));
    }

    public static getAPKUrl(device: string, pkg: IPackage): string {
        return `/${device}/apk/` + pkg.app_id + '-' + pkg.version_code.toString(10) + '.apk';
    }

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }
}

