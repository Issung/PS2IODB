# PS2IODB Website <img align="right" width="103" height="90" src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/2300px-React-icon.svg.png">

## Project Structure:
The website is build using React, TypeScript, & ThreeJS.\
The source code is inside `/website/src` and the icons are stored in `/website/public/icons` (for the time being).

## Running
VSCode is a good IDE for this project, many extensions may help you but recommended are [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) and [JavaScript and TypeScript Nightly](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-next).

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

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More
To learn React, check out the [React documentation](https://reactjs.org/).
