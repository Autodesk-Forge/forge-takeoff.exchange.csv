# forge-takeoff.exchange.csv

[![Node.js](https://img.shields.io/badge/Node.js-14.16-blue.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-6.14-blue.svg)](https://www.npmjs.com/)
![Platforms](https://img.shields.io/badge/Web-Windows%20%7C%20MacOS%20%7C%20Linux-lightgray.svg)
[![Data-Management](https://img.shields.io/badge/Data%20Management-v1-green.svg)](http://developer.autodesk.com/)

[![ACC](https://img.shields.io/badge/ACC-v1-green.svg)](http://developer.autodesk.com/)
[![Takeoff](https://img.shields.io/badge/Takeoff-v1-green.svg)](http://developer.autodesk.com/)

[![MIT](https://img.shields.io/badge/License-MIT-blue.svg)](http://opensource.org/licenses/MIT)
[![Level](https://img.shields.io/badge/Level-Intermediate-blue.svg)](http://developer.autodesk.com/)

## UPDATED April/2022

## Demonstration

https://www.youtube.com/watch?v=pZlKA6NftKY

Included support for locations and the new endpoints for creating and updating Takeoff packages, classification systems and measurement systems.
Here are the steps to make it work (just like in the video ;) ):

1. Export one classification as csv from this sample (we also have an empty one at **samples** folder) through the button **_Export Classification_**.
2. You can update existing classifications (through the button **_Update Classification_**) or create a new classification system (through the option **_Import Classification_**) based on a csv available.
3. You can also change the **_Measurement System_** through the options available (Metric and Imperial).

## Description

This sample demonstrates how to retrieve, classify and export data of inventories and classifications from Autodesk Takeoff. You can also import and classification systems and change the measurement system.
It includes the tasks below:

1. Display Autodesk Takeoff Inventory in **readable form** or **raw form** in two tables (one for the items grouped and other for all items).
2. Export Autodesk Takeoff Inventory from **current** or **all** packages available in **readable form** or **raw form** from both tables to a CSV file.
3. Display Takeoff Measurement System currently defined and an interface to modify it (when possible).
4. Display Classifications systems from available classification systems.
5. Export classifications from available classification systems.
6. Import and Update classification systems (when possible).

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
3. **Autodesk Takeoff**: Create ACC project, activate Takeoff module, according to [the guide](https://knowledge.autodesk.com/support/takeoff/learn-explore/caas/CloudHelp/cloudhelp/ENU/Takeoff-GS/files/Getting-Started-Takeoff-html.html)
4. **Node.js**: basic knowledge with [**Node.js**](https://nodejs.org/en/).
5. **JavaScript** basic knowledge with **jQuery**

For using this sample, you need an Autodesk developer credentials. Visit the [Forge Developer Portal](https://developer.autodesk.com), sign up for an account, then [create an app](https://developer.autodesk.com/myapps/create). For this new app, use **http://localhost:3000/api/forge/callback/oauth** as Callback URL. Finally take note of the **Client ID** and **Client Secret**.

## Running locally

Install [NodeJS](https://nodejs.org), version 14 or newer.

Clone this project or download it (this `nodejs` branch only). It's recommended to install [GitHub desktop](https://desktop.github.com/). To clone it via command line, use the following (**Terminal** on MacOSX/Linux, **Git Shell** on Windows):

    git clone https://github.com/Autodesk-Forge/forge-takeoff.exchange.csv

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

1. Once you select a project, the sample will load the packages available. **With project and package/classification selected, you need to click on load/refresh button in order to retrieve the results to the table.**
2. When **Project Settings** panel is selected, the sample shows a list of classification systems available classifications systems and display the content of the selected one in one table. At the right side it shows UI to handle **Measurement System**, **Import Classification**, **Update Classification** (these first three might be disables depending on usage on your project) and **Export Classification**.
3. When **Items** panel is selected, the sample shows a list of packages available and display the content of the selected one in two tables. The first Table shows the data classified according to the chosen options and the second shows each individual takeoff item. At the right side it shows UI to handle **Export** based on **grouped items** or **list of all items** for the selected package or the whole project.

## Deployment

To deploy this application to Heroku, the **Callback URL** for Forge must use your `.herokuapp.com` address. After clicking on the button below, at the Heroku Create New App page, set your Client ID, Secret and Callback URL for Forge.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/Autodesk-Forge/forge-takeoff.exchange.csv)

## Known issues

1. For the extraction as CSV, the fileds containing commas are replaced by blank spaces, so they're not mistaken as another column.

## Tips & Tricks

1. **When Importing or Updating, the first line of the csv is reserved for header and is ignored.**

2. **Be aware of the limitations when creating and updating classification system or changing measurement systems.**

3. **After changing between tabs or projects, it might take some seconds to show the proper buttons and check what is available to change. It's a good practice to wait the loading and then perform the tasks.**

## Troubleshooting

1. **Cannot see my ACC projects**: Make sure to provision the Forge App Client ID within the ACC Account, [learn more here](https://forge.autodesk.com/blog/bim-360-docs-provisioning-forge-apps). This requires the Account Admin permission.

## Further Reading

**Document**:

- This sample is based on [Learn Forge Tutorial](https://github.com/Autodesk-Forge/learn.forge.viewhubmodels/tree/nodejs), please check details there about the basic framework if you are not familar.
- [Data Management API](https://developer.autodesk.com/en/docs/data/v2/overview/)
- [ACC API](https://developer.autodesk.com/en/docs/bim360/v1/overview/) and [App Provisioning](https://forge.autodesk.com/blog/bim-360-docs-provisioning-forge-apps)
- [Autodesk Takeoff API](https://forge.autodesk.com/en/docs/acc/v1/tutorials/takeoff/)
- [TAKEOFF API UPDATE BLOG](https://forge.autodesk.com/blog/takeoff-api-enhancement-write-access-settings-classifications-and-packages)
- [Create ACC project, activate and configure Takeoff module](https://knowledge.autodesk.com/support/takeoff/learn-explore/caas/CloudHelp/cloudhelp/ENU/Takeoff-GS/files/Getting-Started-Takeoff-html.html)
- [View BIM 360/ACC Models Tutorial](http://learnforge.autodesk.io/#/tutorials/viewhubmodels)

**Blogs**:

- [Forge Blog](https://forge.autodesk.com/blog/autodesk-takeoff-api)
- [Field of View](https://fieldofviewblog.wordpress.com/), a BIM focused blog

## License

This sample is licensed under the terms of the [MIT License](http://opensource.org/licenses/MIT). Please see the [LICENSE](LICENSE) file for full details.

## Written by

João Martins [@JooPaulodeOrne2](http://twitter.com/JooPaulodeOrne2), [Developer Advocate and Support](http://forge.autodesk.com)
