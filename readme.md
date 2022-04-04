# Readme

## Strapi Api Controllers Usage.

**Note**: 

- Ensure Strapi controllers unlocked to public, otherwise Forbidden!. Unless you have public key to use. Implementation be advised.
- Ensure to create .**env** to run development and **.env.prod** to run production mode. Refer to .env.example

 

claim-sale

| Method | Path | Handler |
| --- | --- | --- |
| Post | "/claim-sale-validate", | "claim-sale.validate", |
| Post | "/claim-sale-batch” | "claim-sale.batchCreate" |

e-incentive-rebate

| Method | Path | Handler |
| --- | --- | --- |
| Post | "/e-incentive-validate" | "e-incentive-rebate.validate” |
| Post | "/e-incentive-batch" | "e-incentive-rebate.batchCreate" |
| Post | "/e-incentive-attachment-batch” | "e-incentive-rebate.batchAttachment” |

e-display

| Method | Path | Handler |
| --- | --- | --- |
| Post | "/e-displays-validate” | "e-display.validate” |
| Post | /e-displays-batch” | "e-display.batchCreate” |

inventory

| Method | Path | Handler |
| --- | --- | --- |
| Post | “/inventory-list-batch” | "inventory.batchCreate” |
| Post | “/inventory-list-validate” | "inventory.validate” |

e-payment-voucher

| Method | Path | Handler |
| --- | --- | --- |
| Post | "/e-payment-voucher-batch” | "e-payment-voucher.batchCreate", |
| Post | "/e-payment-voucher-validate” | "e-payment-voucher.validate” |

outlet

| Method | Path | handler |
| --- | --- | --- |
| Post | "/time-settings-validate” | "outlet.timeSettingsValidate” |
| Post | "/outlets-time-settings-batch” | "outlet.timeSettingsBatch” |

## Run Application

Currently running at port 3300, 

Run Development Mode with TypeScript

`npm run dev` 

Run Development Mode PreCompiled JS in Dist Folder

`npm run preserve`

`npm run serve`

Run Producttion Mode PreCompled JS in Dist Folder

`npm run prestart`

`npm run start`

Example Running Package.

```tsx
"scripts": {
    "dev": "ts-node-dev src/index.ts",
    "build": "rimraf dist && tsc",
    "preserve": "npm run build",
    "serve": "cross-env NODE_ENV=development concurrently \"tsc --watch\" \"nodemon -q dist/index.js\"",
    "prestart": "npm run build",
    "start": "cross-env NODE_ENV=production node dist/index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
```