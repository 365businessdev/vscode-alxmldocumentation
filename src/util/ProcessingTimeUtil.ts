import { performance } from "perf_hooks";

export class ProcessingTimeUtil {

    /**
     * Threshold values to log performance issues.
     */
    private defaultInfoThld: number = 20; // log info in console equal or larger then 10ms
    private defaultWarningThld: number = 100; // log warning in console equal or larger then 100ms

    private devMode: boolean = false; // enable this to log processing times to console

    private startingTime: number = 0;

    constructor() {
        if (!this.devMode){
            return;
        }
        
        this.startingTime = performance.now();
    }

    public Measure(context: string = "", infoThld: number = 0, warningThld = 0) {
        if (!this.devMode){
            return;
        }

        if (infoThld === 0) {
            infoThld = this.defaultInfoThld;
        }
        if (warningThld === 0) {
            warningThld = this.defaultWarningThld;
        }

        let endingTime: number = performance.now();
        let runTime: number = Math.round(((endingTime) - this.startingTime) * 100 / 100);

        let msgText = `Process ${context !== "" ? "'" + context + "'" : ""} took ${runTime}ms to finish. Threshold is defined at: `;

        if (runTime >= warningThld) {
            console.warn(`${msgText}${warningThld}ms.`);
            return;
        }
        if (runTime >= infoThld) {
            console.info(`${msgText}${infoThld}ms.`);
            return;
        }
    }
}