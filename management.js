define( function(require, exports, module){
  "use strict";
  main.consumes = ["ui", "commands", "Dialog", "Panel", "http", "tree", "tabManager", "layout", "settings", "dialog.file", "fs", "Form"];
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
    var fs = imports.fs;
    var Form = imports.Form;

    var Tree = require("ace_tree/tree");
    var TreeData = require("./controllerdp");
    var endpoint = "http://" + location.hostname + ":3000";

    var markup = require("text!./management.xml");
    var css = require("text!./management.css");
    var datagridMarkup = require("text!./datagrid.xml");

    var cacheList = [];

    /***** Initialization *****/
    var plugin = new Panel("Controller List", main.consumes, {
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

    var container, btnActivate, btnInactivate, btnDelete, btnEdit, btnManagement, btnAdd;
    var ctrlModel, datagrid, ctrlform;

    var loaded = false;
    function load(){
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
        exec: function(){
          // TODO: inactivate
          var item = datagrid.selection.getCursor();
          inactivateController(item);
        }
      }, plugin);

      commands.addCommand({
        name: "delete",
        exec: function(){
          datagrid.execCommand("delete");
        }
      }, plugin);

      commands.addCommand({
        name: "edit",
        exec: function(){
          // TODO: edit
        }
      }, plugin);

      commands.addCommand({
        name: "manage",
        exec: function(){
          // TODO: manage
          var item = datagrid.selection.getCursor();
          selectMapleApp(item);
        }
      }, plugin);

      commands.addCommand({
        name: "add",
        group: "DevOpen",
        exec: addController
      }, plugin);

      // Context menu for tree
      var itemCtxTreeDeploy = new ui.item({
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
        ui.insertByIndex(mnuCtxTree, itemCtxTreeDeploy, 170, plugin);
      });

      // Load CSS
      ui.insertCss(css, false, plugin);

      return loaded;
    }

    var drawn = false;
    function draw(e){
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

      var scroller = bar.$ext.appendChild(document.createElement("div"));
      // opts.html.innerHTML = "HELLO";
      scroller.className = "scroller";

      // Create UI elements
      var parent = bar;
      ui.insertMarkup(parent, markup, plugin);

      container = plugin.getElement("hbox");
      btnActivate = plugin.getElement("btnActivate");
      btnInactivate = plugin.getElement("btnInactivate");
      btnDelete = plugin.getElement("btnDelete");
      btnEdit = plugin.getElement("btnEdit");
      btnManagement = plugin.getElement("btnManagement");
      btnAdd = plugin.getElement("btnAdd");

      btnActivate.on("click", function(){
        // TODO: activate ui
      });
      btnInactivate.on("click", function(){
        // TODO: inactivate ui
      });
      btnDelete.on("click", function(){
        // TODO: delete selected controller
      });
      btnEdit.on("click", function(){
        // TODO: edit controller information
      });
      btnManagement.on("click", function(){
        // TODO: show controller management ui
      });
      btnAdd.on("click", function(){
        // TODO: add a controller
      });

      var frame = ui.frame({
        htmlNode: scroller,
        buttons: "min",
        activetitle: "min",
        caption: "Controller List"
      });
      ui.insertByIndex(scroller, frame.$ext, 200, false);
      plugin.addElement(frame);


      // TODO: Show datagrid
      ctrlModel = new TreeData();
      ctrlModel.emptyMessage = "No controller to display";
      ctrlModel.$sortNodes = false;

      ctrlModel.$sorted = false;
      ctrlModel.columns = [{
        caption: "UUID",
        value: "uuid",
        width: "60%"
      }, {
        caption: "Name",
        value: "name",
        width: "40%"
      }, {
        caption: "Status",
        value: "status",
        width: "50"
      }];

      layout.on("eachTheme", function(e){
        var height = parseInt(ui.getStyleRule(".bar-preferences .blackdg .tree-row", "height"), 10) || 24;
        ctrlModel.rowHeightInner = height;
        ctrlModel.rowHeight = height;

        if (e.changed) {
          datagrid.resize(true);
        }
      });

      reloadCtrlModel();

      // TODO: introduce datagrid aml definition
      ui.insertMarkup(frame, datagridMarkup, plugin);
      var datagridEl = plugin.getElement("datagrid");

      // var div = frame.$ext.appendChild(document.createElement("div"));
      // div.style.width = "100%";
      // div.style.height = "200px";
      // div.style.marginTop = "50px";

      datagrid = new Tree(datagridEl.$ext);
      datagrid.renderer.setTheme({ cssClass: "blackdg" });
      datagrid.setOption("maxLines", 200);
      datagrid.setDataProvider(ctrlModel);

      layout.on("resize", function() {
        datagrid.resize();
      }, plugin);

      function setTheme(e) {
        // TODO
      }
      layout.on("themeChange", setTheme);
      setTheme({ theme: settings.get("user/general/@skin") });

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
      alert("<p>Controller: " + controller + "</p><p>Path: " + path + "</p>");
    }

    function activateController(controller) {
      http.request(endpoint + "/activate/" + controller.uuid, {
        method: "GET"
      }, function(err, data, res) {
        if (err) throw err;
        if (res.status == 200) {
          tabManager.open({
            name: "controller-" + controller.uuid,
            editorType : "preview",
            document   : {
              title: "[C]" + controller.name,
              preview: {
                path: location.protocol + "//" + location.hostname + ":" + data.port
              }
            },
            active     : true
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
    // controllerpanel.on("draw", function(e) {
    //         draw(e);
    // });
    plugin.on("unload", function(){
      loaded = false;
      drawn = false;

      ctrlModel = null;
      datagrid = null;
    });



    /***** Register and define API *****/

    register(null, {
      "controller.management": plugin
    });
  }
});
