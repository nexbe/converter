import path from "path";
const baseURL = "";
const loggingSetting: any = {
	options: {
		maxFiles: "7d", // log file per day
		maxSize: "500m",
		defaultLevel: "debug",
		zippedArchive: true, // achieve log file to zip
		enableLogFile: true, // create log file
		logURL: path.resolve(baseURL, `../logs/`),
		isSilent: false, // display winston log on terminal
	},
};

export { loggingSetting as config };
