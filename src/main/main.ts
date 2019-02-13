import { app, BrowserWindow, dialog } from 'electron';
import { ipcMain } from 'electron';
import * as path from 'path';
import * as url from 'url';
import fs from 'fs';
const acorn = require("acorn");
const astravel = require('astravel');
import { generate } from 'astring';
import { any } from 'prop-types';
import parseHandler from './parseHandler';
import Store from '../renderer/store';

/* test of reducing Moment library size */
import * as moment from 'moment';

let now = moment().format('LLLL');

let mainWindow: Electron.BrowserWindow;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 920,
    width: 1150,
  });

  // and load the index.html of the app.
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, './index.html'),
      protocol: 'file:',
      slashes: true,
    })
  );

  // Open the DevTools.

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it"s common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

/*********************************************
 * Event listeners from Renderer to Main
 *********************************************/
ipcMain.on('saveCustomConfig', (event: any, rootDirectoryCustomConfig: string) => {


  fs.writeFile(rootDirectoryCustomConfig + '/webpack.config.js', formattedCode1ToSave, (err) => {
    if (err) {
      console.log(err);
      return;
    }
  });
});


ipcMain.on('selectCustomWebConfig', (event: any, arg: any) => {
  let customDirectory: string = dialog.showOpenDialog({ properties: ['openDirectory'] })[0];

  if (!customDirectory) {
    return false;
  }
  mainWindow.webContents.send('root-is-selected');

  mainWindow.webContents.send('customRootDirectrySet', customDirectory)
});

let customAST: any = {};
let ReactAST: any = {};
let CSSAST: any = {};
let SassAST: any = {};
let LessAST: any = {};
let stylusAST: any = {};
let svgAST: any = {};
let pngAST: any = {};
let moduleExist: boolean = false;
let numberOfRules: number = 0;
let typescriptSelected: boolean = false;
let formattedCode1ToSave = '';


ipcMain.on('CustomAST', (event: any, arg: any) => {
  fs.readFile(__dirname + '/../src/src_custom_config/webpack.config.js', (err, data) => {
    if (err) return console.log(err);
    const astCustomConfig = acorn.parse(data.toString(), {
      ecmaVersion: 6,
      locations: true,
    });
    customAST = astCustomConfig;
    const formattedCode1 = generate(customAST, {
      comments: true,
    });

    formattedCode1ToSave = formattedCode1

    mainWindow.webContents.send('transferCustomAST', formattedCode1)
  });
});

ipcMain.on('addReactToAST', (event: any, arg: any) => {
  fs.readFile(__dirname + '/../src/src_custom_config/React.config.js', (err, data) => {
    if (err) return console.log(err);
    ReactAST = acorn.parse(data.toString(), {
      ecmaVersion: 6,
      locations: true,
    });

    let customASTPropertyKey: string[] = [];
    let ReactASTPropertyKey: string[] = ["module", "resolve", "devServer"];

    if (numberOfRules === 0) {
      customAST.body[customAST.body.length - 1].expression.right.properties.push(ReactAST.body[0].expression.right.properties[0])
      moduleExist = true;
      numberOfRules += 1;
    } else {
      customAST.body[customAST.body.length - 1].expression.right.properties.forEach((el, i) => {
        if (el.key.name === "module") {
          let moduleArr = el.value.properties
          moduleArr.forEach((moduleEl) => {
            if (moduleEl.key.name === "rules") {
              moduleEl.value.elements.unshift(ReactAST.body[0].expression.right.properties[0].value.properties[0].value.elements[0]);
            }
          });
        }
      });
      moduleExist = true;
      numberOfRules += 1;
    }

    if (customASTPropertyKey.indexOf("resolve") === -1) {
      customAST.body[customAST.body.length - 1].expression.right.properties.push(ReactAST.body[0].expression.right.properties[1]);
    }

    if (customASTPropertyKey.indexOf("devServer") === -1) {
      customAST.body[customAST.body.length - 1].expression.right.properties.push(ReactAST.body[0].expression.right.properties[2]);
    }

    const formattedCode1 = generate(customAST, {
      comments: true,
    })

    formattedCode1ToSave = formattedCode1;
    mainWindow.webContents.send('transferCustomAST', formattedCode1);
  });
});

ipcMain.on('removeReactToAST', (event: any, arg: any) => {
  let module_index = 0;
  let resolve_index = 0;
  let devServer_index = 0;
  for (let i = 0; i < customAST.body[customAST.body.length - 1].expression.right.properties.length; i += 1) {
    if (customAST.body[customAST.body.length - 1].expression.right.properties[i].key.name === "module") module_index = i
  }

  if (numberOfRules === 1 && customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties.length === 1) {
    customAST.body[customAST.body.length - 1].expression.right.properties.splice(module_index, 1)
    numberOfRules -= 1;
  } else if (numberOfRules > 1 && customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties.length === 1) {

    for (let j = 0; j < customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements.length; j += 1) {
      if (customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements[j].properties[0].value.raw.includes("js|jsx")) {
        customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements.splice(j, 1);
        numberOfRules -= 1;
      }
    }
  }

  for (let i = 0; i < customAST.body[customAST.body.length - 1].expression.right.properties.length; i += 1) {
    if (customAST.body[customAST.body.length - 1].expression.right.properties[i].key.name === "resolve") { console.log('hi'); resolve_index = i }
  }
  if (!typescriptSelected) {
    customAST.body[customAST.body.length - 1].expression.right.properties.splice(resolve_index, 1)
  } //insert logic to remove typescript

  for (let i = 0; i < customAST.body[customAST.body.length - 1].expression.right.properties.length; i += 1) {
    if (customAST.body[customAST.body.length - 1].expression.right.properties[i].key.name === "devServer") devServer_index = i
  }

  customAST.body[customAST.body.length - 1].expression.right.properties.splice(devServer_index, 1)
  const formattedCode1 = generate(customAST, {
    comments: true,
  });
  formattedCode1ToSave = formattedCode1;

  mainWindow.webContents.send('transferCustomAST', formattedCode1);
});

ipcMain.on('addCSSToAST', (event: any, arg: any) => {
  fs.readFile(__dirname + '/../src/src_custom_config/CSS.config.js', (err, data) => {
    if (err) return console.log(err);
    CSSAST = acorn.parse(data.toString(), {
      ecmaVersion: 6,
      locations: true,
    });

    let customASTPropertyKey: string[] = [];
    customAST.body[customAST.body.length - 1].expression.right.properties.forEach((el) => {
      customASTPropertyKey.push(el.key.name);

    });

    if (customASTPropertyKey.indexOf(CSSAST.body[0].expression.right.properties[0].key.name) === -1) {
      customAST.body[customAST.body.length - 1].expression.right.properties.push(CSSAST.body[0].expression.right.properties[0])
      moduleExist = true;
      numberOfRules += 1;
    } else {
      let customASTModulePropertyKey: string[] = [];
      customAST.body[customAST.body.length - 1].expression.right.properties.forEach((el) => {
        if (el.key.name === "module") {
          let moduleArr = el.value.properties
          moduleArr.forEach((moduleEl) => {
            if (moduleEl.key.name === "rules") {
              moduleEl.value.elements.push(CSSAST.body[0].expression.right.properties[0].value.properties[0].value.elements[0])
            }
          });
        }
      });
      moduleExist = true;
      numberOfRules += 1;
    }

    const formattedCode1 = generate(customAST, {
      comments: true,
    });

    formattedCode1ToSave = formattedCode1;
    mainWindow.webContents.send('transferCustomAST', formattedCode1);
  });
});

ipcMain.on('removeCSSToAST', (event: any, arg: any) => {
  let module_index = 0;
  for (let i = 0; i < customAST.body[customAST.body.length - 1].expression.right.properties.length; i += 1) {
    if (customAST.body[customAST.body.length - 1].expression.right.properties[i].key.name === "module") module_index = i
  }

  if (numberOfRules === 1 && customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties.length === 1) {
    customAST.body[customAST.body.length - 1].expression.right.properties.splice(module_index, 1)
    numberOfRules -= 1;
  } else if (numberOfRules > 1 && customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties.length === 1) {
    for (let j = 0; j < customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements.length; j += 1) {
      if (customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements[j].properties[0].value.raw.includes(".css")) {
        customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements.splice(j, 1)
        numberOfRules -= 1;
      }
    }
  }
  const formattedCode1 = generate(customAST, {
    comments: true,
  })
  formattedCode1ToSave = formattedCode1;

  mainWindow.webContents.send('transferCustomAST', formattedCode1);
});

ipcMain.on('addSassToAST', (event: any, arg: any) => {

  fs.readFile(__dirname + '/../src/src_custom_config/Sass.config.js', (err, data) => {
    if (err) return console.log(err);
    SassAST = acorn.parse(data.toString(), {
      ecmaVersion: 6,
      locations: true,
    });

    let customASTPropertyKey: string[] = []
    customAST.body[customAST.body.length - 1].expression.right.properties.forEach((el) => {
      customASTPropertyKey.push(el.key.name);
    });

    if (customASTPropertyKey.indexOf(SassAST.body[0].expression.right.properties[0].key.name) === -1) {
      moduleExist = true;
      numberOfRules += 1;
      console.log('hi2')
      customAST.body[customAST.body.length - 1].expression.right.properties.push(SassAST.body[0].expression.right.properties[0])
    } else {
      let customASTModulePropertyKey: string[] = [];
      customAST.body[customAST.body.length - 1].expression.right.properties.forEach((el) => {
        if (el.key.name === "module") {
          let moduleArr = el.value.properties
          moduleArr.forEach((moduleEl) => {
            if (moduleEl.key.name === "rules") {
              moduleEl.value.elements.push(SassAST.body[0].expression.right.properties[0].value.properties[0].value.elements[0])
            }
          })
        }
      })
      moduleExist = true;
      numberOfRules += 1;
    }

    const formattedCode1 = generate(customAST, {
      comments: true,
    })
    formattedCode1ToSave = formattedCode1
    mainWindow.webContents.send('transferCustomAST', formattedCode1)
  })
})

ipcMain.on('removeSassToAST', (event: any, arg: any) => {
  let module_index = 0;
  for (let i = 0; i < customAST.body[customAST.body.length - 1].expression.right.properties.length; i += 1) {
    if (customAST.body[customAST.body.length - 1].expression.right.properties[i].key.name === "module") module_index = i
  }

  if (numberOfRules === 1 && customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties.length === 1) {

    customAST.body[customAST.body.length - 1].expression.right.properties.splice(module_index, 1)
    numberOfRules -= 1;
  } else if (numberOfRules > 1 && customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties.length === 1) {
    for (let j = 0; j < customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements.length; j += 1) {
      if (customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements[j].properties[0].value.raw.includes(".scss")) {
        customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements.splice(j, 1)
        numberOfRules -= 1;
      }
    }
  }
  const formattedCode1 = generate(customAST, {
    comments: true,
  })
  formattedCode1ToSave = formattedCode1
  mainWindow.webContents.send('transferCustomAST', formattedCode1)
})



ipcMain.on('addLessToAST', (event: any, arg: any) => {

  fs.readFile(__dirname + '/../src/src_custom_config/Less.config.js', (err, data) => {
    if (err) return console.log(err);
    LessAST = acorn.parse(data.toString(), {
      ecmaVersion: 6,
      locations: true,
    });
    let customASTPropertyKey: string[] = []
    customAST.body[customAST.body.length - 1].expression.right.properties.forEach((el) => {
      customASTPropertyKey.push(el.key.name);
    });

    if (customASTPropertyKey.indexOf(LessAST.body[0].expression.right.properties[0].key.name) === -1) {
      moduleExist = true;
      numberOfRules += 1;
      customAST.body[customAST.body.length - 1].expression.right.properties.push(LessAST.body[0].expression.right.properties[0])
    } else {
      let customASTModulePropertyKey: string[] = [];
      customAST.body[customAST.body.length - 1].expression.right.properties.forEach((el) => {
        if (el.key.name === "module") {
          let moduleArr = el.value.properties;
          moduleArr.forEach((moduleEl) => {
            if (moduleEl.key.name === "rules") {
              moduleEl.value.elements.push(LessAST.body[0].expression.right.properties[0].value.properties[0].value.elements[0])
            }
          })
        }
      })
      moduleExist = true;
      numberOfRules += 1;
    }

    const formattedCode1 = generate(customAST, {
      comments: true,
    })
    formattedCode1ToSave = formattedCode1

    mainWindow.webContents.send('transferCustomAST', formattedCode1)
  })
})

ipcMain.on('removeLessToAST', (event: any, arg: any) => {
  let module_index = 0;
  for (let i = 0; i < customAST.body[customAST.body.length - 1].expression.right.properties.length; i += 1) {
    if (customAST.body[customAST.body.length - 1].expression.right.properties[i].key.name === "module") module_index = i
  }

  if (numberOfRules === 1 && customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties.length === 1) {

    customAST.body[customAST.body.length - 1].expression.right.properties.splice(module_index, 1)
    numberOfRules -= 1;
  } else if (numberOfRules > 1 && customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties.length === 1) {
    for (let j = 0; j < customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements.length; j += 1) {
      if (customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements[j].properties[0].value.raw.includes(".less")) {
        customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements.splice(j, 1)
        numberOfRules -= 1;
      }
    }
  }

  const formattedCode1 = generate(customAST, {
    comments: true,
  })
  formattedCode1ToSave = formattedCode1;
  mainWindow.webContents.send('transferCustomAST', formattedCode1);
})

ipcMain.on('addStylusToAST', (event: any, arg: any) => {

  fs.readFile(__dirname + '/../src/src_custom_config/stylus.config.js', (err, data) => {
    if (err) return console.log(err);
    stylusAST = acorn.parse(data.toString(), {
      ecmaVersion: 6,
      locations: true,
    });

    let customASTPropertyKey: string[] = []
    customAST.body[customAST.body.length - 1].expression.right.properties.forEach((el) => {
      customASTPropertyKey.push(el.key.name);
    });

    if (customASTPropertyKey.indexOf(stylusAST.body[0].expression.right.properties[0].key.name) === -1) {
      moduleExist = true;
      numberOfRules += 1;
      customAST.body[customAST.body.length - 1].expression.right.properties.push(stylusAST.body[0].expression.right.properties[0])
    } else {
      let customASTModulePropertyKey: string[] = [];
      customAST.body[customAST.body.length - 1].expression.right.properties.forEach((el) => {
        if (el.key.name === "module") {
          let moduleArr = el.value.properties
          moduleArr.forEach((moduleEl) => {
            if (moduleEl.key.name === "rules") {
              moduleEl.value.elements.push(stylusAST.body[0].expression.right.properties[0].value.properties[0].value.elements[0])
            }
          })
        }
      })
      moduleExist = true;
      numberOfRules += 1;
    }

    const formattedCode1 = generate(customAST, {
      comments: true,
    })
    formattedCode1ToSave = formattedCode1

    mainWindow.webContents.send('transferCustomAST', formattedCode1)
  })
})

ipcMain.on('removeStylusToAST', (event: any, arg: any) => {
  let module_index = 0;
  for (let i = 0; i < customAST.body[customAST.body.length - 1].expression.right.properties.length; i += 1) {
    if (customAST.body[customAST.body.length - 1].expression.right.properties[i].key.name === "module") module_index = i
  }

  if (numberOfRules === 1 && customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties.length === 1) {

    customAST.body[customAST.body.length - 1].expression.right.properties.splice(module_index, 1)
    numberOfRules -= 1;
  } else if (numberOfRules > 1 && customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties.length === 1) {
    for (let j = 0; j < customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements.length; j += 1) {
      if (customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements[j].properties[0].value.raw.includes(".styl")) {
        customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements.splice(j, 1)
        numberOfRules -= 1;
      }
    }
  }
  const formattedCode1 = generate(customAST, {
    comments: true,
  })
  formattedCode1ToSave = formattedCode1

  mainWindow.webContents.send('transferCustomAST', formattedCode1)
})

ipcMain.on('addSVGToAST', (event: any, arg: any) => {

  fs.readFile(__dirname + '/../src/src_custom_config/svg.config.js', (err, data) => {
    if (err) return console.log(err);
    svgAST = acorn.parse(data.toString(), {
      ecmaVersion: 6,
      locations: true,
    });

    let customASTPropertyKey: string[] = []
    customAST.body[customAST.body.length - 1].expression.right.properties.forEach((el) => {
      customASTPropertyKey.push(el.key.name);
    });

    if (customASTPropertyKey.indexOf(svgAST.body[0].expression.right.properties[0].key.name) === -1) {
      moduleExist = true;
      numberOfRules += 1;
      customAST.body[customAST.body.length - 1].expression.right.properties.push(svgAST.body[0].expression.right.properties[0])
    } else {
      let customASTModulePropertyKey: string[] = [];
      customAST.body[customAST.body.length - 1].expression.right.properties.forEach((el) => {
        if (el.key.name === "module") {
          let moduleArr = el.value.properties
          moduleArr.forEach((moduleEl) => {
            if (moduleEl.key.name === "rules") {
              moduleEl.value.elements.push(svgAST.body[0].expression.right.properties[0].value.properties[0].value.elements[0])
            }
          })
        }
      })
      moduleExist = true;
      numberOfRules += 1;
    }

    const formattedCode1 = generate(customAST, {
      comments: true,
    })
    formattedCode1ToSave = formattedCode1

    mainWindow.webContents.send('transferCustomAST', formattedCode1)
  })
})

ipcMain.on('removeSVGToAST', (event: any, arg: any) => {
  let module_index = 0;
  for (let i = 0; i < customAST.body[customAST.body.length - 1].expression.right.properties.length; i += 1) {
    if (customAST.body[customAST.body.length - 1].expression.right.properties[i].key.name === "module") module_index = i
  }

  if (numberOfRules === 1 && customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties.length === 1) {

    customAST.body[customAST.body.length - 1].expression.right.properties.splice(module_index, 1)
    numberOfRules -= 1;
  } else if (numberOfRules > 1 && customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties.length === 1) {
    console.log('more than 1')
    for (let j = 0; j < customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements.length; j += 1) {
      console.log(typeof customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements[j].properties[0].value.raw)
      if (customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements[j].properties[0].value.raw.includes(".svg")) {
        customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements.splice(j, 1)
        numberOfRules -= 1;
      }
    }
  }
  const formattedCode1 = generate(customAST, {
    comments: true,
  })
  console.log(formattedCode1)
  formattedCode1ToSave = formattedCode1

  mainWindow.webContents.send('transferCustomAST', formattedCode1)
})

ipcMain.on('addPNGToAST', (event: any, arg: any) => {
  console.log('hi')

  fs.readFile(__dirname + '/../src/src_custom_config/png.config.js', (err, data) => {
    if (err) return console.log(err);
    console.log('hi')
    pngAST = acorn.parse(data.toString(), {
      ecmaVersion: 6,
      locations: true,
    });
    console.log('PNG')
    console.log('read' + JSON.stringify(pngAST.body[0].expression.right.properties[0]))
    console.log('AST')
    let customASTPropertyKey: string[] = []
    customAST.body[customAST.body.length - 1].expression.right.properties.forEach((el) => {
      customASTPropertyKey.push(el.key.name)
    });

    if (customASTPropertyKey.indexOf(pngAST.body[0].expression.right.properties[0].key.name) === -1) {
      moduleExist = true;
      numberOfRules += 1;
      console.log('hi2')
      customAST.body[customAST.body.length - 1].expression.right.properties.push(pngAST.body[0].expression.right.properties[0])
    } else {
      console.log('hi1')
      let customASTModulePropertyKey: string[] = [];
      customAST.body[customAST.body.length - 1].expression.right.properties.forEach((el) => {
        if (el.key.name === "module") {
          let moduleArr = el.value.properties
          moduleArr.forEach((moduleEl) => {
            if (moduleEl.key.name === "rules") {
              console.log('here')
              console.log(JSON.stringify(moduleEl.value.elements))
              console.log(JSON.stringify(pngAST.body[0].expression.right.properties[0].value.properties[0].value.elements[0]))
              moduleEl.value.elements.push(pngAST.body[0].expression.right.properties[0].value.properties[0].value.elements[0])
            }
          })
        }
      })
      moduleExist = true;
      numberOfRules += 1;
    }

    console.log(JSON.stringify(customAST.body[customAST.body.length - 1].expression.right.properties))
    const formattedCode1 = generate(customAST, {
      comments: true,
    })
    console.log(formattedCode1)
    formattedCode1ToSave = formattedCode1

    mainWindow.webContents.send('transferCustomAST', formattedCode1)
  })
})

ipcMain.on('removePNGToAST', (event: any, arg: any) => {
  let module_index = 0;
  for (let i = 0; i < customAST.body[customAST.body.length - 1].expression.right.properties.length; i += 1) {
    if (customAST.body[customAST.body.length - 1].expression.right.properties[i].key.name === "module") module_index = i
  }
  console.log(JSON.stringify(customAST.body[customAST.body.length - 1].expression.right.properties))

  if (numberOfRules === 1 && customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties.length === 1) {
    console.log('just than 1')

    customAST.body[customAST.body.length - 1].expression.right.properties.splice(module_index, 1)
    numberOfRules -= 1;
  } else if (numberOfRules > 1 && customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties.length === 1) {
    console.log('more than 1')
    for (let j = 0; j < customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements.length; j += 1) {
      console.log(typeof customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements[j].properties[0].value.raw)
      if (customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements[j].properties[0].value.raw.includes(".png")) {
        customAST.body[customAST.body.length - 1].expression.right.properties[module_index].value.properties[0].value.elements.splice(j, 1)
        numberOfRules -= 1;
      }
    }
  }
  const formattedCode1 = generate(customAST, {
    comments: true,
  })
  formattedCode1ToSave = formattedCode1

  console.log(formattedCode1)
  mainWindow.webContents.send('transferCustomAST', formattedCode1)
})

ipcMain.on('load-package.json', (event: any, arg: any) => {
  // arg unimportant. selectPackage shows file dialog
  console.log(arg) // prints "ping"
  event.sender.send('asynchronous-reply', 'pong')  // sends pong as test

  selectPackageJson();
})

ipcMain.on('read-config', (event: any, configNumber: any) => {
  // after package.json is loaded configs have been sent to renderer and user
  // has now selected one and we need to load
  console.log("on load-config")
  console.log("use configuration: ", configNumber)

  readConfig(configNumber)
})

ipcMain.on('load-stats.json', (event: any, arg: any) => {
  // arg unimportant. User has selected to load a stats file. selectStatsJson() will present file loading dialog
  console.log(arg) // prints "ping"
  event.sender.send('asynchronous-reply', 'pong')

  selectStatsJson()
})

ipcMain.on('loadStats2', () => {
  parseHandler.loadStats2();
});

ipcMain.on('install-pluggins', (event: any, arrPluginsChecked: string[]) => {
  //npm install --prefix ./install/here mini-css-extract-plugin

  var exec = require('child_process').exec;
  var child;

  parseHandler.initEntryPoints()

  if (arrPluginsChecked.indexOf('checkedMoment') > -1) {
    parseHandler.loadPlugin("Moment")
  }
  if (arrPluginsChecked.indexOf('checkedSplitChunks') > -1) {
    parseHandler.loadPlugin("SplitChunks")
  }
  if (arrPluginsChecked.indexOf('checkedMini') > -1) {
    parseHandler.loadPlugin("Mini")
  }

  var p1 = Promise.resolve(3);
  var p2 = 1337;
  var p3 = new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve("foo");
    }, 100);
  });

  Promise.all([p1, p2, p3])
    .then(values => {
      console.log(values); // [3, 1337, "foo"]

      setTimeout(() => {
        mainWindow.webContents.send('display-config', parseHandler.updatedConfig);
        parseHandler.saveConfig();
      }, 400);
    });
});

ipcMain.on('save-config', (event: any, configToSave: string) => {
  parseHandler.saveConfig();
});

function selectPackageJson() {
  let file = dialog.showOpenDialog({ properties: ['openFile'] }) // 'openDirectory', 'multiSelections'
  if (file === undefined) {
    return false;
  }

  mainWindow.webContents.send('package-is-selected');
  loadPackage(file[0]);
}

let directory = "";
let directory2 = "";

function loadPackage(file: string) {

  if (file.includes("/")) {
    directory = file.substring(0, file.lastIndexOf("/"));
    parseHandler.setWorkingDirectory(directory);
  } else {
    directory = file.substring(0, file.lastIndexOf("\\"));
    directory2 = file.substring(0, file.lastIndexOf("\\"));
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      console.log(err);
      return;
    }
    selectConfig(JSON.parse(data.toString()));
  });
}

// temp store variable. This shouldn't be global, but works for the moment.
let listOfConfigs: Array<string> = [];

let entryPoints: any = {}

let ast: any = {}

function selectConfig(packageFile: any) {

  let output = "webpack configurations in package.json.\n";
  listOfConfigs = [];
  const entries = packageFile.scripts;

  for (let entry in entries) {
    if (entries[entry].includes('webpack')) {
      output += `${entry} - ${entries[entry]}\n`
      listOfConfigs.push(entries[entry]);
    }
  }

  mainWindow.webContents.send('choose-config', listOfConfigs)   // react should render the list in TabTwo
}

function readConfig(entry: number) {

  let selectedConfig = listOfConfigs[entry];

  if (!selectedConfig.match('--json')) {
    selectedConfig += ' --json > stats.json';
  }

  if (selectedConfig.match('--open')) {
    selectedConfig = selectedConfig.replace(' --open', '');
  }

  if (selectedConfig.match('-dev-server')) {
    selectedConfig = selectedConfig.replace('-dev-server', '');
  }

  // console.log('new selected config: -----', selectedConfig);

  let config = "webpack.config.js";
  if (listOfConfigs[entry].includes("--config")) {
    config = listOfConfigs[entry].split("--config")[1].trimLeft().split(" ")[0]
  }

  fs.readFile(directory + "/" + config, (err, data) => {
    if (err) {
      console.log("An error ocurred loading: " + err.message);
      console.log(err);
      return;
    }
    const configFile: string = data.toString();

    const tempObj = parseHandler.parseConfig(configFile, directory + "/" + config)  //configFile is the text file contents (.js) and config is the filepath
    entryPoints = tempObj.entryPoints;
    ast = tempObj.ast;
    parseHandler.setWorkingDirectory(directory, selectedConfig);

    // present user list of plugins
    // receive selected plugins
    // * load and parse plugins
    // * merge plugins - itterate
    // write the config
  });
}


/**
 * Event handlers - file loading / parsing
 * Loading parsing of webpack stats file
 **/

function selectStatsJson() {
  let file = dialog.showOpenDialog({ properties: ['openFile'] })

  if (file === undefined) {
    console.log('no gooo');
    return false;
  }

  loadStats(file[0]);
  mainWindow.webContents.send('stats-is-selected');
}

// fix cancel errors
process.on('uncaughtException', function (error) {
  // Handle the error
  let err = error;
  return err;
});

function loadStats(file: string) {
  fs.readFile(file, (err, data) => {
    if (err) {
      console.log(err);
      return;
    }
    // clean and send back JSON stats file
    let content: any = data.toString();

    content = content.substr(content.indexOf("{"));

    //splits multiple JSON objects if more than one exists in file
    content = content.split(/}[\n\r\s]+{/);

    // repair brackets from split
    if (content.length > 1) {
      for (let i = 0; i < content.length; i++) {
        content[i] = (i > 0) ? "{" : "" + content[i] + (i < content.length - 1) ? "}" : ""
      }
    }

    content = JSON.parse(content[0])
    while (!content.hasOwnProperty("builtAt")) {
      content = content.children[0]
    }
    let returnObj: any = {};
    returnObj.timeStamp = Date.now();
    returnObj.time = content.time;
    returnObj.hash = content.hash;
    returnObj.errors = content.errors
    returnObj.size = content.assets.reduce((size: number, asset: any): void => size + asset.size, 0)
    returnObj.assets = content.assets.map((asset: any) => ({
      name: asset.name,
      chunks: asset.chunks,
      size: asset.size,
    }));

    returnObj.chunks = content.chunks.map((chunk: any) => ({
      size: chunk.size,
      files: chunk.files,
      modules: chunk.modules ?
        chunk.modules.map((module: any) => ({
          name: module.name,
          size: module.size,
          id: module.id,
        }))
        : [],
    }));

    let Pdata: any = [];
    Pdata.push(returnObj);
    //loops through assets
    let i = 0; // or the latest build
    let path: string;
    let sizeStr: string;
    let sunBurstData = [];


    for (var k = 0; k < Pdata[i].chunks.length; k++) {
      for (var l = 0; l < Pdata[i].chunks[k].modules.length; l++) {
        sizeStr = Pdata[i].chunks[k].modules[l].size.toString();
        path = Pdata[i].chunks[k].modules[l].name.replace("./", "");
        sunBurstData.push([path, sizeStr])
      }
    }
    const sunBurstDataSum: number = sunBurstData.reduce((sum: number, el: any): number => {
      return sum += parseInt(el[1])
    }, 0);

    const returnObjData = {
      chunks: returnObj.chunks,
      assets: returnObj.assets
    }

    mainWindow.webContents.send('display-stats-reply', sunBurstData, returnObjData);
  });
}
