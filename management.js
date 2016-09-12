define( function(require, exports, module){
  "use strict";
  main.consumes = ["ui", "commands", "Dialog", "Panel", "http", "tree", "tabManager", "layout", "settings", "dialog.file", "dialog.confirm", "fs", "Form", "run", "c9"];
  main.provides = ["controller.management"];
  return main;

  function main(options, imports, register){
    var Panel = imports.Panel;
    var ui = imports.ui;
    var commands = imports.commands;
    var Dialog = imports.Dialog;
    var http = imports.http;
    var tree = imports.tree;
    var tabManager = imports.tabManager;
    var layout = imports.layout;
    var settings = imports.settings;
    var fileDialog = imports["dialog.file"];
    var confirm = imports["dialog.confirm"].show;
    var fs = imports.fs;
    var Form = imports.Form;
    var run = imports.run;
    var c9 = imports.c9;
    var join = require("path").join;

    var Tree = require("ace_tree/tree");
    var TreeData = require("./controllerdp");
    var endpoint = "http://" + location.hostname + ":3000";

    var markup = require("text!./management.xml");
    var css = require("text!./management.css");
    var cdatagridMarkup = require("text!./cdatagrid.xml");
    var idatagridMarkup = require("text!./idatagrid.xml");

    var cacheList = [];

    var INTERVAL_MS = 10000;
    var TIMEOUT_MS = 8000;
    var REFRESH_DELAY = 9000;

    /***** Initialization *****/
    var plugin = new Panel("snlab.org", main.consumes, {
      index: options.index || 200,
      width: 200,
      caption: "Controller",
      buttonCSSClass: "controllers",
      panelCSSClass: "controllercontainer",
      minwidth: 130,
      where: options.where || "left"
    });

    var addCtrlDialog = new Dialog("snlab.org", main.consumes, {
      name: "add-ctrl-dialog",
      allowClose: true,
      modal: true,
      title: "Add Controller"
    });

    // var container, btnActivate, btnInactivate, btnDelete;
    // var btnEdit, btnManagement, btnAdd, btnMark;
    var ctrlModel, datagrid, ctrlform;
    var infoModel, idatagrid;
    var intervalUpdate;

    var loaded = false;
    function load() {
      if (loaded) return false;
      loaded = true;

      plugin.setCommand({
        name: "togglecontrollers",
        hint: "show the controller panel"
      });

      //commands
      commands.addCommand({
        name: "activate",
        exec: function(){
          var item = datagrid.selection.getCursor();
          activateController(item);
        }
      }, plugin);

      commands.addCommand({
        name: "inactivate",
        exec: function() {
          var item = datagrid.selection.getCursor();
          inactivateController(item);
        }
      }, plugin);

      commands.addCommand({
        name: "delete",
        exec: function() {
          datagrid.execCommand("delete");
        }
      }, plugin);

      commands.addCommand({
        name: "edit",
        exec: function() {
          // TODO: edit
        }
      }, plugin);

      commands.addCommand({
        name: "manage",
        exec: function() {
          // TODO: manage
          var item = datagrid.selection.getCursor();
          selectProjectToDeploy(item);
        }
      }, plugin);

      commands.addCommand({
        name: "add",
        group: "DevOpen",
        exec: addController
      }, plugin);

      commands.addCommand({
        name: "mark",
        group: "DevOpen",
        exec: function() {
          var item = datagrid.selection.getCursor();
          settings.set("project/devopen/@default_controller", item.uuid);
          reloadCtrlModel();
        }
      }, plugin);

      // Context menu for tree
      var itemCtxTreeDeploy = new ui.item({
        match: "folder",
        caption: "Deploy",
        isAvailable: function() {
          // TODO: Need more complex validation
          return tree.selectedNode && tree.selectedNode.isFolder;
        },
        onclick: function() {
          var uuid = settings.get("project/devopen/@default_controller");
          var controller = cacheList.find(function(e) {
            return e.uuid == uuid;
          });
          if (controller) {
            deployKarToController(controller,
                                  join(c9.workspaceDir, tree.selected));
          }
          else {
            confirm("No default controller?",
                    "No controller to deploy, you need to configure a default controller or add a new one.",
                    "Would you like to go to controller panel?",
                    function() {
                      commands.exec("togglecontrollers");
                    });
          }
        }
      });
      tree.getElement("mnuCtxTree", function(mnuCtxTree) {
        ui.insertByIndex(mnuCtxTree, itemCtxTreeDeploy, 170, plugin);
      });

      // Load CSS
      ui.insertCss(css, false, plugin);

      return loaded;
    }

    var drawn = false;
    function draw(e) {
      if (drawn) return false;
      drawn = true;

      //Import Skin
      ui.insertSkin({
        name: "controllers",
        data: require("text!./skin.xml"),
        "media-path" : options.staticPrefix + "/images/",
        "icon-path"  : options.staticPrefix + "/icons/"
      }, plugin);

      // Create UI elements
      var bar = e.aml;

      // Create UI elements
      var parent = bar;
      ui.insertMarkup(parent, markup, plugin);

      // container = plugin.getElement("hbox");
      // btnActivate = plugin.getElement("btnActivate");
      // btnInactivate = plugin.getElement("btnInactivate");
      // btnDelete = plugin.getElement("btnDelete");
      // btnEdit = plugin.getElement("btnEdit");
      // btnManagement = plugin.getElement("btnManagement");
      // btnAdd = plugin.getElement("btnAdd");
      // btnMark = plugin.getElement("btnMark");

      var scroller = bar.$ext.appendChild(document.createElement("div"));
      scroller.className = "scroller";

      var listFrame = ui.frame({
        htmlNode: scroller,
        buttons: "min",
        activetitle: "min",
        caption: "Controller List"
      });
      ui.insertByIndex(scroller, listFrame.$ext, 200, false);
      plugin.addElement(listFrame);

      var infoFrame = ui.frame({
        htmlNode: scroller,
        butons: "min",
        activetitle: "min",
        caption: "More Information"
      });
      ui.insertByIndex(scroller, infoFrame.$ext, 300, false);
      plugin.addElement(infoFrame);

      /**
       * Data Provider for Controller List
       */
      ctrlModel = new TreeData();
      ctrlModel.emptyMessage = "No controller to display";
      ctrlModel.$sortNodes = false;

      ctrlModel.$sorted = false;
      ctrlModel.columns = [{
        caption: "UUID",
        value: "uuid",
        width: "40%"
      }, {
        caption: "Name",
        value: "name",
        width: "60%",
        getText: function(node) {
          return node.name +
            (isDefaultController(node.uuid) ? " (default)" : "");
        }
      }, {
        caption: "Status",
        value: "status",
        width: "50",
        getText: function(node) {
          return node.status.ssh;
        },
        getHTML: function(node) {
          return "<span class='icon cover' style='background-image: url(" +
            options.staticPrefix + "/icons/" +
            (node.status.ssh || "unknown") + ".png)'></span>";
        }
      }];

      /**
       * Data Provider for Controller Information
       */
      infoModel = new TreeData();
      infoModel.emptyMessage = "No information to display";
      infoModel.$sortNodes = false;

      infoModel.$sorted = false;
      infoModel.columns = [{
        caption: "Argument",
        value: "argument",
        width: "100px"
      }, {
        caption: "Value",
        value: "value",
        width: "100%",
        getText: function(node) {
          if (node.argument == "password") {
            return "********";
          }
          return node.value;
        }
      }];

      reloadCtrlModel();

      ui.insertMarkup(listFrame, cdatagridMarkup, plugin);
      var cdatagridEl = plugin.getElement("cdatagrid");

      datagrid = new Tree(cdatagridEl.$ext);
      datagrid.renderer.setTheme({ cssClass: "blackdg" });
      datagrid.setOption("maxLines", 200);
      datagrid.setDataProvider(ctrlModel);

      ui.insertMarkup(infoFrame, idatagridMarkup, plugin);
      var idatagridEl = plugin.getElement("idatagrid");

      idatagrid = new Tree(idatagridEl.$ext);
      idatagrid.renderer.setTheme({ cssClass: "blackdg" });
      idatagrid.setOption("maxLines", 200);
      idatagrid.setDataProvider(infoModel);

      /**
       * Lifecycle for datagrid
       */
      layout.on("eachTheme", function(e){
        var height = parseInt(ui.getStyleRule(".bar-preferences .blackdg .tree-row", "height"), 10) || 24;
        ctrlModel.rowHeightInner = height;
        ctrlModel.rowHeight = height;

        infoModel.rowHeightInner = height;
        infoModel.rowHeight = height;

        if (e.changed) {
          datagrid.resize(true);
          idatagrid.resize(true);
        }
      });

      layout.on("resize", function() {
        datagrid.resize();
        idatagrid.resize();
      }, plugin);

      datagrid.on("mousemove", function() {
        datagrid.resize(true);
      });

      datagrid.on("delete", function() {
        var nodes = datagrid.selection.getSelectedNodes();
        nodes.forEach(function (node) {
          removeController(node.uuid);
          reloadCtrlModel();
        });
      });

      datagrid.on("select", function() {
        reloadInfoModel();
      });

      idatagrid.on("mousemove", function() {
        idatagrid.resize(true);
      });

      var intervalUpdate = setInterval(updateSSHStatus, INTERVAL_MS);

      return loaded;
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

    function reloadInfoModel() {
      if (!infoModel || !datagrid.selection.getCursor()) {
        return;
      }

      var item = datagrid.selection.getCursor();
      infoModel.setRoot({children : [
        {
          argument: "name",
          value: item.name
        },
        {
          argument: "ip address",
          value: item.ip
        },
        {
          argument: "restful port",
          value: item.restPort
        },
        {
          argument: "ssh port",
          value: item.sshPort
        },
        {
          argument: "ssh login",
          value: item.login
        },
        {
          argument: "ssh password",
          value: item.password
        }
      ]});
    }

    function addController() {
      addCtrlDialog.show();
    }

    function removeController(uuid) {
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

    function selectProjectToDeploy(controller) {
      fileDialog.show("Select a bundle or kar", "", function(path, stat, done) {
        fs.readFile(path, function(err, data) {
          if (err) throw err;

          var ext = path.split(".").pop();
          if (ext === "kar") {
            deployKarToController(controller, join(c9.workspaceDir, path));
          } else {
            alert("No *.kar file selected!");
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

    function deployKarToController(controller, path) {
      var configs = settings.getJson("/project/run/configs") || {};
      configs["default controller"] = {
        command: [path,
                    '-c', controller.ip,
                    '-p', controller.sshPort,
                    '-l', controller.login,
                    '-P', controller.password].join(' '),
        default: true,
        name: "default controller",
        runner: "devopen",
        toolbar: true
      };
      settings.setJson("project/run/configs", configs);

      commands.exec("run");
    }

    function activateController(controller) {
      http.request(endpoint + "/activate/" + controller.uuid, {
        method: "GET"
      }, function(err, data, res) {
        if (err) throw err;
        if (res.status == 200) {
          tabManager.open({
            name: "controller-" + controller.uuid,
            editorType: "preview",
            document: {
              title: "[C]" + controller.name,
              preview: {
                path: location.protocol + "//" + location.hostname + ":" + data.port
              }
            },
            active: true
          }, function(err, tab, done, existing) {
            if (existing)
              tab.editor.reload();
          });
        }
      });
    }

    function inactivateController(controller) {
      http.request(endpoint + "/inactivate/" + controller.uuid, {
        method: "GET"
      }, function(err, data, res) {
        if (err) throw err;
        if (res.status == 200) {
          tabManager.findTab("controller-" + controller.uuid).close();
          reloadCtrlModel();
        }
      });
    }

    function updateSSHStatus() {
      var rows = ctrlModel.root.children;
      var status = {};
      rows.forEach(function(row) {
        http.request(endpoint + '/testssh/' + row.uuid, {
          timeout: TIMEOUT_MS
        }, function(err, data, res) {
          if (err) throw err;
          if (res.status == 200) {
            status[row.uuid] = data.status;
          }
        });
      });
      setTimeout(function() {
        var current = ctrlModel.root.children;
        current.forEach(function(row) {
          row.status.ssh = status[row.uuid] || row.status.ssh;
        });
        ctrlModel.setRoot({children: current});
      }, REFRESH_DELAY);
    }

    function defaultRunner() {
    }

    function isDefaultController(uuid) {
      return settings.get("project/devopen/@default_controller") == uuid;
    }

    /***** Lifecycle *****/

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

    plugin.on("activate", function(e) {
      if (!drawn) return;

      datagrid.resize();
    });

    plugin.on("resize", function(e) {
      datagrid && datagrid.resize();
    });

    plugin.on("draw", function(e) {
      draw(e);
    });

    plugin.on("load", function(){
      load();
    });

    plugin.on("unload", function(){
      loaded = false;
      drawn = false;

      clearInterval(intervalUpdate);
      ctrlModel = null;
      datagrid = null;
    });

    /***** Register and define API *****/

    plugin.freezePublicAPI({
      /**
       *
       */
      defaultRunner: defaultRunner
    });

    register(null, {
      "controller.management": plugin
    });
  }
});
