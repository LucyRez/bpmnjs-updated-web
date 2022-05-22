import React, { Component, Fragment } from "react";
import BpmnModeler from "./custom-modeler";

import ZoomControls from "./components/ZoomControls";
import FileControls from "./components/FileControls";
import EditingTools from "./components/EditingTools";

import "./style/app.less";

import xmlStr from "../../assets/bpmn/xmlStr";

let API_KEY = "AIzaSyAZu6de7KmSBmZ1nECXGetEHxDEW-M1KEE";
let CLIENT_ID =
  "678728296685-j36q7483ffmjelmc9vled9rfr26ds67e.apps.googleusercontent.com";

// Array of API discovery doc URLs for APIs
const DISCOVERY_DOCS = [
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = "https://www.googleapis.com/auth/drive";

let scale = 1;
let pickerInited = false;

export default class extends Component {
  state = {
    name: "",
    googleAuth: "",
    tokenClient: "",
  };

  componentDidMount() {
    const saved = localStorage.getItem("savedXML");

    document.body.className = "shown";

    this.bpmnModeler = new BpmnModeler({
      container: "#canvas",
    });

    // this.bpmnModeler.on('commandStack.changed', this.onChange);

    const { xml = xmlStr } = this.props;

    var script = document.createElement("script");
    script.onload = this.handleClientLoad;
    script.src = "https://apis.google.com/js/api.js";
    document.body.appendChild(script);

    if (saved == null) {
      this.renderDiagram(xml);
    } else {
      this.renderDiagram(saved);
    }
  }

  componentWillReceiveProps(nextProps) {
    const { xml } = nextProps;
    if (xml && xml !== this.props.xml) {
      this.renderDiagram(xml);
    }
  }

  shouldComponentUpdate() {
    return false;
  }

  handleClientLoad = () => {
    window.gapi.load("client:auth2", this.initClient);
  };

  renderDiagram = (xml) => {
    this.bpmnModeler.importXML(xml, (err) => {
      if (err) {
        // import failed :-(
        console.log("error rendering", err);
      } else {
        // we did well!
        this.bpmnModeler.getDefinitions();
        console.log("successfully rendered");
      }
    });
  };

  handleSave = (e) => {
    this.bpmnModeler.saveXML({ format: true }, (err, xml) => {
      console.log(xml);
      localStorage.setItem("savedXML", xml);
      console.log(this.bpmnModeler.getDefinitions());
    });
  };

  handleRedo = () => {
    this.bpmnModeler.get("commandStack").redo();
  };

  handleUndo = () => {
    this.bpmnModeler.get("commandStack").undo();
  };

  handleZoom = () => {
    this.bpmnModeler.get("canvas").zoom(scale);
  };

  handleZoomIn = () => {
    scale += 0.1;
    this.handleZoom();
  };

  handleZoomOut = () => {
    if (scale <= 0.3) {
      scale = 0.2;
    } else {
      scale -= 0.1;
    }
    this.handleZoom();
  };

  handleZoomReset = () => {
    scale = 1;
    this.handleZoom();
  };

  handleOpen = () => {};

  handleCreate = () => {
    this.renderDiagram(xmlStr);
  };

  handleSaveFile = () => {};

  handleSaveImage = () => {};

  handleSignIn = () => {
    window.gapi.load("picker", this.initPicker);
    this.state.googleAuth.signIn();
    this.updateSigninStatus();
  };

  handleImportFromGD = () => {
    //this.state.googleAuth.signIn();

    if (pickerInited && this.state.tokenClient) {
      console.log("enter View");
      var view = new window.google.picker.View(
        window.google.picker.ViewId.DOCS
      );
      view.setMimeTypes(
        "application/vnd.bpmn, application/vnd.google-apps.folder"
      );
      var picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .enableFeature(window.google.picker.Feature.MULTISELECT_DISABLED)
        .setDeveloperKey(API_KEY)
        .setOAuthToken(this.state.tokenClient)
        .addView(view)
        .addView(new window.google.picker.DocsUploadView())
        .setCallback(this.importPickerCallback)
        .build();
      picker.setVisible(true);
    }
  };

  handleExportToGD = () => {
    //this.state.googleAuth.signIn();

    if (pickerInited && this.state.tokenClient) {
      console.log("enter View");
      var view = new window.google.picker.DocsView(
        window.google.picker.ViewId.FOLDERS
      );
      view.setIncludeFolders(true);
      view.setSelectFolderEnabled(true);
      view.setMimeTypes("application/vnd.google-apps.folder");
      var picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .setDeveloperKey(API_KEY)
        .setOAuthToken(this.state.tokenClient)
        .addView(view)
        .addView(
          new window.google.picker.DocsUploadView().setIncludeFolders(true)
        )
        .setCallback(this.exportPickerCallback)
        .build();
      picker.setVisible(true);
    }
  };

  importPickerCallback = (data) => {
    if (data.action == window.google.picker.Action.PICKED) {
      var fileId = data.docs[0].id;
      alert("The user selected: " + fileId);
      this.handleImport(fileId);
    }
  };

  exportPickerCallback = (data) => {
    if (data.action == window.google.picker.Action.PICKED) {
      var fileId = data.docs[0].id;
      alert("The user selected: " + fileId);
      this.saveXMLToGD(fileId);
    }
  };

  handleImport = (id) => {
    window.gapi.client.drive.files
      .get({
        fileId: id,
        alt: "media",
        fields: "name, fileExtension, trashed",
      })
      .then((res) => {
        //currentFile.filename = res.result.name
        //currentFile.fileid = url
        window.gapi.client.drive.files
          .get({
            fileId: id,
            alt: "media",
          })
          .then((res) => {
            let data = res.body;
            console.log(data);
            this.bpmnModeler.importXML(data);
          });
      });
  };

  /**
   *  Initializes the API client library and sets up sign-in state
   *  listeners.
   */
  initClient = () => {
    //setIsLoadingGoogleDriveApi(true);
    window.gapi.client
      .init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES,
      })
      .then(() => {
        this.setState({
          googleAuth: window.gapi.auth2.getAuthInstance(),
        });
        this.state.googleAuth.isSignedIn.listen(this.updateSigninStatus);
        // Listen for sign-in state changes.
      });
  };

  initPicker = async () => {
    pickerInited = true;
  };

  /**
   *  Called when the signed in status changes, to update the UI
   *  appropriately. After a sign-in, the API is called.
   */
  updateSigninStatus = () => {
    this.setSigninStatus();
  };

  setSigninStatus = async () => {
    var user = this.state.googleAuth.currentUser.get();

    this.setState({
      tokenClient: window.gapi.auth2
        .getAuthInstance()
        .currentUser.get()
        .getAuthResponse(true).access_token,
    });

    console.log(user);
    if (user.wt == null) {
      this.setState({
        name: "",
      });
    } else {
      var isAuthorized = user.hasGrantedScopes(SCOPES);
      if (isAuthorized) {
        //this.saveXMLToGD();

        console.log("is authorized");
      }
    }
  };

  createEmptyFolder() {
    window.gapi.client.drive.files
      .create({
        resource: {
          name: "bpmn-js",
          mimeType: "application/vnd.google-apps.folder" || "text/plain",
        },
        fields: "id",
      })
      .then(function (response) {
        console.log("creating empty folder");
        console.log(response.id);
        return response.id;
      });
  }

  saveXMLToGD = (folderId) => {
    console.log("saving to folder");
    console.log(folderId);

    var result;
    this.bpmnModeler.saveXML({ format: true }, (err, xml) => {
      result = xml;
    });
    const boundary = "boundary-string";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";
    let fileType = "application/vnd.bpmn";
    let contentType = fileType || "text/plain";
    let name = "diagram" + Date.now().toString();
    let metadata = {
      name: name,
      mimeType: contentType,
      parents: [folderId],
    };

    let base64Data = this.utf8_to_b64(result);
    let multipartRequestBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: " +
      contentType +
      "\r\n" +
      "Content-Transfer-Encoding: base64\r\n" +
      "\r\n" +
      base64Data +
      close_delim;
    let param = {
      path: "/upload/drive/v3/files/",
      method: "POST",
      params: {
        uploadType: "multipart",
      },
      headers: {
        "Content-Type": 'multipart/related; boundary="' + boundary + '"',
      },
      body: multipartRequestBody,
    };
    let request = window.gapi.client.request(param);
    try {
      request.execute((file) => {
        console.log(file);
      });
    } catch (e) {
      console.error(e);
    }
  };

  utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
  }

  render() {
    return (
      <Fragment>
        <div className="content">
          <div id="canvas" />
        </div>
        <ZoomControls
          onZoomIn={this.handleZoomIn}
          onZoomOut={this.handleZoomOut}
          onZoomReset={this.handleZoomReset}
        />
        <FileControls
          onOpen={this.handleOpen}
          onCreate={this.handleCreate}
          onSaveFile={this.handleSaveFile}
          onSaveImage={this.handleSaveImage}
          onSaveFileToGD={this.handleExportToGD}
          onImportFileFromGD={this.handleImportFromGD}
        />
        <EditingTools
          onSave={this.handleSave}
          onRedo={this.handleRedo}
          onUndo={this.handleUndo}
          onLogin={this.handleSignIn}
        />
      </Fragment>
    );
  }
}
