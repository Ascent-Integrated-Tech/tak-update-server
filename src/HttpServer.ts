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

        this.app.use(express.static(path.join(__dirname, '../ui/build')));

        this.app.get('/manage', (req, res) => {
            if (req.query.token !== TOKEN) {
                res.status(404).end();
                return;
            }
            res.sendFile(path.join(__dirname, '../ui/build', 'index.html'));
        });

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

        // New endpoint to serve the package data as JSON
        this.app.get('/api/packages', async (req, res) => {
            if (req.query.token !== TOKEN) {
                res.status(404).end();
                return;
            }
            let packages = await PackageModel.getAll_();
            res.json(packages);
        });

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
            res.redirect(`/manage?token=${TOKEN}`);
        }));

        this.app.delete('/:device/delete/:appId', (async (req, res) => {
            if (req.query.token !== TOKEN) {
                res.status(404).end();
                return;
            }

            const device = req.params.device.toUpperCase();
            const appId = req.params.appId;

            console.log(`Delete request for package ID: ${req.params.appId}`);
            try {
                await PackageManager.Instance.deletePackage(appId, device);
                res.status(200).json({ message: 'Package deleted successfully' });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Failed to delete package' });
            }
        }));
    }

    public static getAPKUrlwD(device: string, pkg: IPackage): string {
        return `/${device}/apk/` + pkg.app_id + '-' + pkg.version_code.toString(10) + '.apk';
    }

    public static getAPKUrl(pkg: IPackage): string {
        return `/apk/` + pkg.app_id + '-' + pkg.version_code.toString(10) + '.apk';
    }

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }
}

