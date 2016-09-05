var insertTopology;

define(function(require, exports, module) {
  main.consumes = ["Panel", "PreferencePanel", "menus", "ui", "commands", "layout", "settings", "Dialog", "Form", "dialog.file", "dialog.alert", "fs", "vfs", "tabManager", "http", "tree", "util"];
  main.provides = ["controller.manager"];
  return main;

  function main(options, imports, register) {
    var Panel = imports.Panel;
    var PreferencePanel = imports.PreferencePanel;
    var settings = imports.settings;
    var ui = imports.ui;
    var commands = imports.commands;
    var layout = imports.layout;
    var Dialog = imports.Dialog;
    var Form = imports.Form;
    var fileDialog = imports["dialog.file"];
    var alert = imports["dialog.alert"].show;
    var fs = imports.fs;
    var vfs = imports.vfs;
    var tabManager = imports.tabManager;
    var http = imports.http;
    var tree = imports.tree;
    var util = imports.util;

    var Tree = require("ace_tree/tree");
    var TreeData = require("./controllerdp");
    var endpoint = "http://" + location.hostname + ":3000";

    var cdatagrid, ccontainer, intro;
    var ctrlModel, ctrlform, panelform;
    var scontainer;
    var currentCtrl;

    var cacheList = [];

    /***** Initialization *****/

    var plugin = new Panel("snlab.org", main.consumes, {
      caption: "Controller Manager",
      index: 400,
      where: "left"
    });

    var addCtrlDialog = new Dialog("snlab.org", main.consumes, {
      name: "add-ctrl-dialog",
      allowClose: true,
      modal: true,
      title: "Add Controller"
    });

    var loaded = false;
    function load() {
      if (loaded) return false;
      loaded = true;

      // Controller Manager Init
      commands.addCommands([
        {
          name: "addController",
          group: "DevOpen",
          exec: addController
        },
        {
          name: "selectMapleApp",
          group: "DevOpen",
          exec: selectMapleApp
        }
      ], plugin);

      // Context menu for tree
      var itemCtxTreePreview = new ui.item({
        match: "folder",
        caption: "Deploy",
        isAvailable: function(){
          // TODO: Need more complex validation
          return tree.selectedNode && tree.selectedNode.isFolder;
        },
        onclick: function(){
          // openPreview(tree.selected);
          if (cacheList.length) {
            deployMapleAppFromKar(cacheList[0], tree.selected);
          }
          else {
            alert("No controller to deploy, please add one!");
          }
        }
      });
      tree.getElement("mnuCtxTree", function(mnuCtxTree) {
        ui.insertByIndex(mnuCtxTree, itemCtxTreePreview, 170, plugin);
      });

      return loaded;
    }

    var drawn;
    function draw(e) {
      if (drawn) return;
      drawn = true;

      panelform = new Form({});

      ctrlModel = new TreeData();
      ctrlModel.emptyMessage = "No controller to display";

      ctrlModel.columns = [{
        caption: "Name",
        value: "name",
        width: "100"
      }, {
        caption: "IP",
        value: "ip",
        width: "100"
      }, {
        caption: "SSH Port",
        value: "sshPort",
        width: "100"
      }];

      layout.on("eachTheme", function(e){
        var height = parseInt(ui.getStyleRule(".bar-preferences .blackdg .tree-row", "height"), 10) || 24;
        ctrlModel.rowHeightInner = height;
        ctrlModel.rowHeight = height;

        if (e.changed) {
          cdatagrid.resize(true);
        }
      });

      reloadCtrlModel();

      // plugin.add({
      //   "Maple": {
      //     position: 10,
      //     "Controller Manager": {
      //       position: 200,
      //       "Controller Manager": {
      //         type: "custom",
      //         title: "Controller Manager",
      //         position: 30,
      //         node: ccontainer = new ui.bar({
      //           style: "padding:10px"
      //         })
      //       }
      //     }
      //   }
      // }, plugin);
      // ccontainer = new ui.bar({
      //   style: "padding:10px"
      // });

      var cdiv = e.aml.$ext.appendChild(document.createElement("div"));
      cdiv.style.width = "100%";
      cdiv.style.height = "200px";
      cdiv.style.marginTop = "50px";

      cdatagrid = new Tree(cdiv);
      cdatagrid.setTheme({ cssClass: "blackdg" });
      cdatagrid.setDataProvider(ctrlModel);

      layout.on("resize", function() {
        cdatagrid.resize();
      }, plugin);

      function setTheme(e) {
        // TODO
      }
      layout.on("themeChange", setTheme);
      setTheme({ theme: settings.get("user/general/@skin") });

      // ccontainer.on("contextmenu", function() {
      //   return false;
      // });

      cdatagrid.on("mousemove", function() {
        cdatagrid.resize(true);
      });

      cdatagrid.on("delete", function() {
        var nodes = cdatagrid.selection.getSelectedNodes();
        nodes.forEach(function (node) {
          removeController(node.uuid);
          reloadCtrlModel();
        });
      });

      new ui.hbox({
        htmlNode: cdiv.parentNode,
        style: "position:absolute;top:10px;",
        padding: 5,
        childNodes: [
          new ui.button({
            caption: "Add",
            skin: "btn-default-css3",
            class: "dark",
            onclick: function() {
              commands.exec("addController");
            }
          }),
          new ui.button({
            caption: "Remove",
            skin: "btn-default-css3",
            class: "btn-red",
            onclick: function() {
              cdatagrid.execCommand("delete");
            }
          }),
          new ui.button({
            caption: "Deploy",
            skin: "btn-default-css3",
            class: "dark",
            onclick: function() {
              var item = cdatagrid.selection.getCursor();
              alert(JSON.stringify(item));
              commands.exec("selectMapleApp", item);
            }
          }),
          new ui.button({
            caption: "Activate",
            skin: "btn-default-css3",
            class: "dark",
            onclick: function() {
              var item = cdatagrid.selection.getCursor();
              activateController(item);
            }
          })
        ]
      });

      // ccontainer.attachTo(e.aml);
    }

    /***** Methods *****/

    function reloadCtrlModel() {
      if (!ctrlModel) return;

      http.request(endpoint + '/controllers', function(err, data, res) {
        if (err) throw err;
        if (res.status == 200) {
          cacheList = data;
          ctrlModel.setRoot({children : data});
        }
      });

    }

    function addController() {
      addCtrlDialog.show();
    }

    function removeController(uuid) {
      // TODO: replace to restful api
      http.request(endpoint + '/controllers' + '/' + uuid, {
        method: "DELETE"
      }, function(err, data, res) {
        if (err) throw err;
        if (res.status == 200) {
          // unbindController(uuid);
          return;
        }
        alert("Fail to delete the controller " + uuid);
      });

    }

    function insertController(controller) {
      if (typeof controller == "object") {
        controller.name = controller.name || "untitled";
        controller.ip = controller.ip || "localhost";
        controller.sshPort = controller.sshPort || 8101;
        controller.restPort = controller.restPort || 8181;
        controller.login = controller.login || "karaf";
        controller.password = controller.password || "karaf";
        // controller.status = controller.status || "Unknown";

        http.request(endpoint + '/controllers', {
          method: "POST",
          body: controller
        }, function(err, data, res) {
          if (err) throw err;
          if (res.status == 200) {
            return;
          }
          alert("Fail to insert the controller.");
        });
      }
    }

    /**
     * Bind terminal tab with a controller
     *
     * @param {String} tabName  The name of the terminal editor tab
     * @param {String} uuid     The uuid of the controller
     */
    // function bindController(tabName, uuid) {
    //   var ctrl_list = settings.getJson("project/maple/controllers") || {};
    //   ctrl_list[ctrl_id].tab = tab_name;
    //   ctrl_list[ctrl_id].status = "Connecting";
    //   settings.setJson("project/maple/controllers", ctrl_list);
    //   reloadCtrlModel();
    // }

    /**
     * Unbind terminal tab of a controller
     *
     * @param {String} uuid     The uuid of the controller
     */
    // function unbindController(ctrl_id) {
    //   var ctrl_list = settings.getJson("project/maple/controllers") || {};

    //   if (ctrl_list[ctrl_id]) {
    //     ctrl_list[ctrl_id].tab && delete ctrl_list[ctrl_id].tab;
    //     ctrl_list[ctrl_id].status = "Unknown";
    //   }
    //   settings.setJson("project/maple/controllers", ctrl_list);
    //   reloadCtrlModel();
    // }

    function selectMapleApp(controller) {
      fileDialog.show("Select a bundle or kar", "", function(path, stat, done) {
        fs.readFile(path, function(err, data) {
          if (err) throw err;

          var ext = path.split(".").pop();
          if (ext === "jar") {
            deployMapleAppFromBundle(controller, path);
          } else if (ext === "kar") {
            deployMapleAppFromKar(controller, path);
          }
          fileDialog.hide();
        });
      }, {}, {
        createFolderButton: false,
        shohwFilesCheckbox: true,
        hideFileInput: false,
        chooseCaption: "Import"
      });
    }

    function deployMapleAppFromBundle(controller, path) {
      // Deploy mapleapp.jar
      // alert(vfs.url(path) + "\nid: " + controller.id + "\ntab: " + controller.tab);
      tabManager.getTabs().filter(function(t) {
        return t.name === controller.tab;
      }).forEach(function(tab) {
        tab.editor.write("bundle:install " + vfs.url(path) + "\n");
      });
    }

    function deployMapleAppFromKar(controller, path) {
      // Deploy mapleapp.kar
      // alert(vfs.url(path) + "\nid: " + controller.id + "\ntab: " + controller.tab);
      // tabManager.getTabs().filter(function(t) {
      //   return t.name === controller.tab;
      // }).forEach(function(tab) {
      //   tab.editor.write("kar:install " + vfs.url(path) + "\n");
      // });
      alert("<p>Controller: " + controller + "</p><p>Path: " + path + "</p>");
    }

    function activateController(controller) {
      http.request(endpoint + "/activate/" + controller.uuid, {
        method: "POST"
      }, function(err, data, res) {
        if (err) throw err;
        if (res.status == 200) {
          tabManager.open({
            value: "http://localhost:" + data.port,
            editorType : "urlview",
            // document   : {
            //   urlview : {
            //     backgroundColor : "#FF0000",
            //     dark            : true
            //   }
            // },
            active     : true
          }, function(err, tab) {
            console.log("Done");
          });
        }
      });
    }

    /***** Lifecycle *****/

    // tabManager.on("tabAfterClose", function(e) {
    //   // TODO: replace to restful api
    //   var ctrl_list = settings.getJson("project/maple/controllers") || {};
    //   for (var c in ctrl_list) {
    //     ctrl_list[c].tab && ctrl_list[c].tab === e.tab.name && unbindController(ctrl_list[c].id);
    //   }
    // });

    // TODO: replace to restful api
    settings.on("read", function() {
      settings.setDefaults("project/maple/controllers", []);
    });

    addCtrlDialog.on("draw", function(e) {
      ctrlform = new Form({
        rowHeight: 30,
        colwidth: 100,
        edge: "0 0 0 0",
        form: [
          {
            title: "Controller Name",
            name: "name",
            type: "textbox"
          },
          {
            title: "IP Address",
            name: "ip",
            defaultValue: "localhost",
            type: "textbox"
          },
          {
            title: "SSH Port",
            name: "sshPort",
            defaultValue: 8101,
            type: "textbox"
          },
          {
            title: "REST Port",
            name: "restPort",
            defaultValue: 8181,
            type: "textbox"
          },
          {
            title: "Login Name",
            name: "login",
            defaultValue: "karaf",
            type: "textbox"
          },
          {
            title: "Password",
            name: "password",
            defaultValue: "karaf",
            type: "password"
          },
          {
            type: "submit",
            caption: "OK",
            margin: "10 20 5 20",
            width: 140,
            "default": true,
            onclick: function() {
              var controller = ctrlform.toJson();
              insertController(controller);
              addCtrlDialog.hide();
              reloadCtrlModel();
            }
          }
        ]
      });

      ctrlform.attachTo(e.html);
    });

    addCtrlDialog.on("show", function() {
      ctrlform.reset();
    });

    plugin.on("load", function() {
      load();
    });

    plugin.on("draw", function(e) {
      draw(e);
    });

    plugin.on("activate", function(e) {
      if (!drawn) return;

      cdatagrid.resize();
    });

    plugin.on("resize", function(e) {
      cdatagrid && cdatagrid.resize();
    });

    plugin.on("unload", function() {
      loaded = false;
      drawn = false;

      ctrlModel = null;
      cdatagrid = null;
      ccontainer = null;
      intro = null;
    });

    /***** Register and define API *****/

    register(null, {
      "controller.manager": plugin
    });
  }
});
