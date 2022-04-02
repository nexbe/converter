import  *  as  winston  from  'winston';
import  DailyRotateFile from 'winston-daily-rotate-file';
import dayjs from "dayjs";
import path from "path";

import { config }  from "../config/logger";

// const baseURL = env.BASE_URL || "";
// dirname: path.resolve(baseURL, `exports\\logs\\system\\error.log`),

const randomString =
	Math.random().toString(36).substring(2, 15) +
	Math.random().toString(36).substring(2, 15);

const timestamp = dayjs().valueOf();

const configTransportDefault: DailyRotateFile = new DailyRotateFile({
	filename: `%DATE%.log`,
	dirname: path.resolve(config.options.logURL, `${config.options.defaultLevel}`),
	datePattern: "YYYY-MM-DD",
	zippedArchive: config.options.zippedArchive,
	maxFiles: config.options.maxFiles,
	maxSize: config.options.maxSize,
	level: config.options.defaultLevel,
});

const configTransportError: DailyRotateFile = new DailyRotateFile({
	filename: `%DATE%.log`,
	dirname: path.resolve(config.options.logURL, `error`),
	datePattern: "YYYY-MM-DD",
	zippedArchive: config.options.zippedArchive,
	maxFiles: config.options.maxFiles,
	maxSize: config.options.maxSize,
	level: "error",
});

const transports = [];

if (config.options.enableLogFile) {
	transports.push(configTransportError);
	transports.push(configTransportDefault);
}

transports.push(
	new winston.transports.Console({
		silent: config.options.enableLogFile || false,
	}),
);

const level = () => {
	const env = process.env.NODE_ENV || 'development'
	const isDevelopment = env === 'development'
	return isDevelopment ? 'debug' : 'warn'
}

const winstonFormatProduction = () => {
	return winston.format.combine(
		winston.format.timestamp(),
		winston.format.align(),
		winston.format.prettyPrint()
	);
};

const winstonFormatDevelopment = () => {
	return winston.format.combine(
		winston.format.timestamp(),
		winston.format.colorize({ all: true }),
		winston.format.printf(
			(info) => `${info.timestamp} ${info.level}: ${info.message}`,
		),
	);
};

const Logger = winston.createLogger({
	level: level(),
	format: winstonFormatProduction(),
	transports,
});

// If we're not in production then log to the `console`
if (process.env.NODE_ENV !== 'production') {
	Logger.add(new winston.transports.Console({
		format: winstonFormatDevelopment()
	}));
}


export default Logger;


