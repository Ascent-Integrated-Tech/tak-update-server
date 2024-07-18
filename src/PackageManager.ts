import { ApkInfo } from "./Interfaces";
import fs from 'fs/promises';
import crypto from 'crypto';
import { Apk } from "node-apk";
import { PackageModel } from "./DB/PackageModel";
import { PackageType } from "./Enums";
import JSZip from 'jszip';
import { HttpServer } from "./HttpServer";

type StorageDir = {
    [key: string]: string;
};

export class PackageManager {
    static STORAGE_DIR: StorageDir = {
        "TAB": 'data/TAB/apk',
        "PHN": 'data/PHN/apk',
    };
    static UPDATE_FILE: StorageDir = {
        "TAB": 'data/TAB/product.infz',
        "PHN": 'data/PHN/product.infz'
    };
    private static _instance: PackageManager;

    async start() {
        for (const [key, value] of Object.entries(PackageManager.STORAGE_DIR)) {
            try {
                await fs.mkdir(value, { recursive: true });
            } catch (error) {
                console.error(`Error creating directory ${value}:`, error);
            }
            await this.generateUpdateFile(key);
        }
    }

    async importFile(device: string, file: string): Promise<boolean> {
        const pkg = await PackageManager.readApk(file)

        if (pkg === null)
            return false;

        let origFile = await PackageModel.getByAppId(pkg.appId, device);
        let fileId;

        if (origFile !== null && origFile.device === device) {
            if (origFile.version_code >= pkg.version) {
                console.log(`[PackageManager] Trying to upload old version of ${pkg.appId}, ${origFile.version_code}->${pkg.version}`);
                return false;
            }

            fileId = origFile.package_id;

            try {
                await fs.unlink(this.getFilePath(device, fileId));
            } catch { }

            console.log('[PackageManager] Upgrading ' + pkg.appId);
        } else {
            fileId = await PackageModel.add(pkg.appId, device);
        }
        let type = (pkg.appId.startsWith('com.atakmap.android') && pkg.appId.endsWith('.plugin')) ? PackageType.plugin : PackageType.app;
        let fileBuffer = await fs.readFile(file);
        let hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        await PackageModel.update(device, fileId, pkg.name, type, pkg.versionName, pkg.version, hash, fileBuffer.length, pkg.minSDK.toString(10), pkg.description, pkg.icon);

        try {
            await fs.copyFile(file, this.getFilePath(device, fileId));
        } catch (e: any) {
            console.log('[PackageManager] Import error: ' + e.toString());
        }

        await this.generateUpdateFile(device);

        return true;
    }

    async generateUpdateFile(device: string) {
        let packages = await PackageModel.getAll(device);

        let productTxtList = '';

        for (let p of packages) {
            productTxtList += [
                p.platform,
                p.type,
                p.app_id,
                p.name,
                p.version,
                p.version_code.toString(10),
                HttpServer.getAPKUrl(p),
                'icon_' + p.package_id + '.png',
                p.description,
                p.apk_hash,
                p.os_requirements,
                p.tak_prereq,
                p.apk_size
            ].join(',');
            productTxtList += '\n';
        }

        let zip = new JSZip();

        zip.file('product.inf', productTxtList);

        for (let p of packages)
            zip.file('icon_' + p.package_id.toString(10) + '.png', p.image);

        let fileData = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

        try {
            await fs.unlink(PackageManager.UPDATE_FILE[device]);
        } catch { }

        await fs.writeFile(PackageManager.UPDATE_FILE[device], fileData);
    }

    getFilePath(device: string, fileId: number): string {
        return PackageManager.STORAGE_DIR[device] + '/' + fileId + '.apk';
    }

    private static async readApk(file: string): Promise<ApkInfo | null> {
        const apk = new Apk(file);

        try {
            const manifest = await apk.getManifestInfo();
            const resources = await apk.getResources();
            // console.log(JSON.stringify(manifest.raw));
            // console.log(JSON.stringify(resources));
            const name = typeof manifest.applicationLabel === 'string' ? manifest.applicationLabel : resources.resolve(manifest.applicationLabel as number)[0].value;
            const minSDK = manifest.raw.children['uses-sdk'][0].attributes.minSdkVersion; //TODO: validate ?
            const icon = manifest.raw.children.application[0].attributes.icon;
            const iconData = await apk.extract(resources.resolve(icon)[0].value);

            let desc = '';
            if (manifest.raw.children.application[0].children['meta-data'] !== undefined) {
                for (let i of manifest.raw.children.application[0].children['meta-data']) {
                    if (i.attributes.name !== 'app_desc')
                        continue;

                    desc = resources.resolve(i.attributes.value)[0].value;
                    break;
                }
            }

            if (desc === '' && manifest.raw.children.application[0].attributes.description !== undefined)
                desc = resources.resolve(manifest.raw.children.application[0].attributes.description)[0].value;


            return {
                appId: manifest.package,
                name: name,
                version: manifest.versionCode,
                versionName: manifest.versionName,
                minSDK: minSDK,
                description: desc,
                icon: iconData
            };
        } catch (e: any) {
            console.log('[PackageManager] APK ' + file + ' read error: ' + e.toString());
            return null;
        } finally {
            apk.close();
        }
    }

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }
}