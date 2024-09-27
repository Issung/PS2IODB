# PS2IODB Website <img align="right" width="103" height="90" src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/2300px-React-icon.svg.png">

This is the PS2IODB website which allows the public to browse and view the icon database.\
The site is built using React, TypeScript, & ThreeJS.\
The components/pages code is inside `/website/src`, the icons are stored in `/website/public/icons`, and tests are inside `/website/src/tests`.

## Running
VSCode is a good IDE for this project, many extensions may help you but we recommend [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) and [JavaScript and TypeScript Nightly](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-next).

With your terminal in the `/website`, you can these commands:

### `npm install`
You will need to run this first before running anything else.\
This command installs all dependencies of the website, listed in `package.json`, without these dependencies the website cannot work.

### `npm start`
Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make any edits.\
You will also see any lint errors in the console.

### `npm test`
Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`
Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
This isn't needed by most developers unless you need to specifically test something, building and deployment will be done by the GitHub Actions CICD.

## Testing
Multiple tests are included which make assertions on the `GameList.tsx` file (which contains all PS2 titles and their contribution status) and the icon assets directory in `/public/icons`.\
The key tests are asserting every GameList entry marked as contributed has a matching folder, and every folder that exists has a matching GameList entry. These tests make it harder for contributors to accidentally break the website's structure.\
These tests can be run using the VSCode test runner, or using `npm test` described above.
