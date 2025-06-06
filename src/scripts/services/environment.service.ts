
export class EnvironmentService {
    private version: number | undefined;

    constructor(getVersion: () => number) {
        this.version = getVersion();
    }

    getMainIntakeUrl(): string {
        return this.getBaseUrl() + "/intake.php";
    }

    getMapIntakeUrl(): string {
        return this.getBaseUrl() + "/map_intake.php";
    }

    getConvertibleIntakeUrl(): string {
        return this.getBaseUrl() + "/convertible_intake.php";
    }

    getMapHelperUrl(): string {
        return this.getBaseUrl() + "/maphelper.php";
    }

    getRhIntakeUrl(): string {
        return this.getBaseUrl() + "/rh_intake.php";
    }

    getRejectionIntakeUrl(): string {
        return this.getBaseUrl() + "/rejection_intake.php";
    }

    getUuidUrl(): string {
        return this.getBaseUrl() + "/uuid.php";
    }

    getBaseUrl(): string {
        if (this.version === undefined || this.version === 0) {
            return "http://localhost";
        }

        return "https://www.mhct.win";
    }
}
