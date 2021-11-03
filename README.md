# forge-acc.takeoff.exchange.csv

[![Node.js](https://img.shields.io/badge/Node.js-14.16-blue.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-6.14-blue.svg)](https://www.npmjs.com/)
![Platforms](https://img.shields.io/badge/Web-Windows%20%7C%20MacOS%20%7C%20Linux-lightgray.svg)
[![Data-Management](https://img.shields.io/badge/Data%20Management-v1-green.svg)](http://developer.autodesk.com/)

[![ACC](https://img.shields.io/badge/ACC-v1-green.svg)](http://developer.autodesk.com/)
[![Takeoff](https://img.shields.io/badge/Takeoff-v1-green.svg)](http://developer.autodesk.com/)

[![MIT](https://img.shields.io/badge/License-MIT-blue.svg)](http://opensource.org/licenses/MIT)
[![Level](https://img.shields.io/badge/Level-Intermediate-blue.svg)](http://developer.autodesk.com/)

## Description

This sample demonstrates how to retrieve, classify and export data of inventories from ACC Takeoff. It includes 2 main tasks:

1. Display ACC Takeoff Inventory either in **Raw data** and **Human readable form**.
2. Export ACC Takeoff Inventory from **current** or **all** packages available either in **Raw data** and **Human readable form** to a CSV file.

This sample is implemented based on Node.js version of [Learn Forge Tutorial](https://github.com/Autodesk-Forge/learn.forge.viewhubmodels/tree/nodejs), please refer to https://learnforge.autodesk.io/ for the details about the framework.

## Thumbnail

![thumbnail](/thumbnail.png)

## Demonstration

https://www.youtube.com/watch?v=_SJVh2si40Y

## Live Demo

https://autodesk-takeoff-exchange.herokuapp.com

# Web App Setup

## Prerequisites

1. **Forge Account**: Learn how to create a Forge Account, activate subscription and create an app at [this tutorial](http://learnforge.autodesk.io/#/account/).
2. **ACC Account**: must be Account Admin to add the app integration. [Learn about provisioning](https://forge.autodesk.com/blog/bim-360-docs-provisioning-forge-apps).
3. **ACC Takeoff**: Create ACC project, activate Takeoff module, according to [the guide](https://knowledge.autodesk.com/support/takeoff/learn-explore/caas/CloudHelp/cloudhelp/ENU/Takeoff-GS/files/Getting-Started-Takeoff-html.html)
4. **Node.js**: basic knowledge with [**Node.js**](https://nodejs.org/en/).
5. **JavaScript** basic knowledge with **jQuery**

For using this sample, you need an Autodesk developer credentials. Visit the [Forge Developer Portal](https://developer.autodesk.com), sign up for an account, then [create an app](https://developer.autodesk.com/myapps/create). For this new app, use **http://localhost:3000/api/forge/callback/oauth** as Callback URL. Finally take note of the **Client ID** and **Client Secret**.

## Running locally

Install [NodeJS](https://nodejs.org), version 14 or newer.

Clone this project or download it (this `nodejs` branch only). It's recommended to install [GitHub desktop](https://desktop.github.com/). To clone it via command line, use the following (**Terminal** on MacOSX/Linux, **Git Shell** on Windows):

    git clone https://github.com/Autodesk-Forge/forge-acc.takeoff.exchange.csv

Install the required packages using `npm install`.

**Environment variables**

Set the enviroment variables with your client ID & secret and finally start it. Via command line, navigate to the folder where this repository was cloned and use the following:

Mac OSX/Linux (Terminal)

    npm install
    export FORGE_CLIENT_ID=<<YOUR CLIENT ID FROM DEVELOPER PORTAL>>
    export FORGE_CLIENT_SECRET=<<YOUR CLIENT SECRET>>
    export FORGE_CALLBACK_URL=<<YOUR CALLBACK URL>>

    npm start

Windows (use **Node.js command line** from Start menu)

    npm install
    set FORGE_CLIENT_ID=<<YOUR CLIENT ID FROM DEVELOPER PORTAL>>
    set FORGE_CLIENT_SECRET=<<YOUR CLIENT SECRET>>
    set FORGE_CALLBACK_URL=<<YOUR CALLBACK URL>>

    npm start

## Using the app

Open the browser: [http://localhost:3000](http://localhost:3000).

**Please watch the [Video](https://www.youtube.com/watch?v=_SJVh2si40Y) for the detail setup and usage, or follow the steps:**

- **Setup the app before using the App**

1. Make sure to [Create ACC project, activate and configure Takeoff module](https://knowledge.autodesk.com/support/takeoff/learn-explore/caas/CloudHelp/cloudhelp/ENU/Takeoff-GS/files/Getting-Started-Takeoff-html.html).

- **Operate with App after setup**

1. Once you select a project, the sample will load the packages available. **With project and package selected, you need to click on load/refresh button in order to retrieve the results to the table.**
2. By simply selecting the radio options you can adjust your data to show human/raw form of the available classifications
3. The first Table shows the data classified according to the chosen options and the second shows each individual takeoff item.

## Deployment

To deploy this application to Heroku, the **Callback URL** for Forge must use your `.herokuapp.com` address. After clicking on the button below, at the Heroku Create New App page, set your Client ID, Secret and Callback URL for Forge.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/Autodesk-Forge/forge-acc.takeoff.exchange.csv)

## Known issues

1. For the extraction as CSV, the fileds containing commas are replaced by blank spaces, so they're not mistaken as another column.

## Tips & Tricks

1. **You'll need to click on load/refresh button after selecting your project and package in order to generate the proper table with the desired takeoff items.** 

## Troubleshooting

1. **Cannot see my ACC projects**: Make sure to provision the Forge App Client ID within the ACC Account, [learn more here](https://forge.autodesk.com/blog/bim-360-docs-provisioning-forge-apps). This requires the Account Admin permission.

## Further Reading

**Document**:

- This sample is based on [Learn Forge Tutorial](https://github.com/Autodesk-Forge/learn.forge.viewhubmodels/tree/nodejs), please check details there about the basic framework if you are not familar.
- [Data Management API](https://developer.autodesk.com/en/docs/data/v2/overview/)
- [ACC API](https://developer.autodesk.com/en/docs/bim360/v1/overview/) and [App Provisioning](https://forge.autodesk.com/blog/bim-360-docs-provisioning-forge-apps)
- [ACC Takeoff API](https://forge.autodesk.com/en/docs/acc/v1/tutorials/takeoff/)
- [Create ACC project, activate and configure Takeoff module](https://knowledge.autodesk.com/support/takeoff/learn-explore/caas/CloudHelp/cloudhelp/ENU/Takeoff-GS/files/Getting-Started-Takeoff-html.html)
- [View BIM 360/ACC Models Tutorial](http://learnforge.autodesk.io/#/tutorials/viewhubmodels)

**Blogs**:

- [Forge Blog](https://forge.autodesk.com/blog/autodesk-takeoff-api)
- [Field of View](https://fieldofviewblog.wordpress.com/), a BIM focused blog

## License

This sample is licensed under the terms of the [MIT License](http://opensource.org/licenses/MIT). Please see the [LICENSE](LICENSE) file for full details.

## Written by

João Martins [@JooPaulodeOrne2](http://twitter.com/JooPaulodeOrne2), [Developer Advocate and Support](http://forge.autodesk.com)
