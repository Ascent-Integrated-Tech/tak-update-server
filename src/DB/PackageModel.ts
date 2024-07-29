import {IPackage} from "./Interfaces";
import {DBHelper} from "./DBHelper";
import {PackagePlatform, PackageType} from "../Enums";

export class PackageModel {
    static async getAll_() : Promise<IPackage[]> {
        return await DBHelper.all<IPackage[]>("SELECT * FROM packages");
    }
    static async getAll(device: string) : Promise<IPackage[]> {
        return await DBHelper.all<IPackage[]>("SELECT * FROM packages WHERE device = ?", [device]);
    }
    static async getById(packageId:number) : Promise<IPackage|null> {
        return (await DBHelper.get<IPackage>("SELECT * FROM packages WHERE package_id = ?", [packageId])) ?? null;
    }
    static async getByAppId(appId:string, device: string) : Promise<IPackage|null> {
        return (await DBHelper.get<IPackage>("SELECT * FROM packages WHERE app_id = ? AND device = ?", [appId, device])) ?? null;
    }
    static async getDevices(appId: string): Promise<string[] | null> {
        let pkgs = await DBHelper.all<IPackage[]>("SELECT * FROM packages WHERE app_id = ?", [appId]) ?? null;
        if (!pkgs || pkgs.length === 0) {
            return null;
        }
        return pkgs.map(pkg => pkg.device);
    }
    static async add(appId:string, device: string) : Promise<number> {
        let platform = PackagePlatform.Android;
        let result = await DBHelper.run("INSERT INTO packages (app_id, platform, device) VALUES (?, ?, ?)",[appId, platform, device]);

        return result.lastID ?? 0;
    }

    static async update(device: string, packageId:number, name: string, type:PackageType, version:string, versionCode:number, apkHash:string, apkSize:number, osRequirements:string, description:string, image:Buffer) {
        await DBHelper.run("UPDATE packages SET device = ?, name = ?, type = ?, version = ?, version_code = ?, apk_hash = ?, apk_size = ?, os_requirements = ?, description = ?, image = ? WHERE package_id = ?",
        [device, name, type, version, versionCode, apkHash, apkSize, osRequirements, description, image, packageId]);
    }

    static async deleteByAppId(appId: string, device: string): Promise<void> {
        await DBHelper.run("DELETE FROM packages WHERE app_id = ? AND device = ?", [appId, device]);
    }
}