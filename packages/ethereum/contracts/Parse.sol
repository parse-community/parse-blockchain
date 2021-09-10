// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract Parse {
  struct Class {
    string name;
    string[] objectsIds;
    mapping(string => string) objectJSONById;
  }

  struct App {
    string id;
    mapping (address => bool) owners;
    string[] classesNames;
    mapping(string => Class) classByName;
  }

  event AppCreated (
    string _appId
  );

  event AppOwnerAdded (
    string _appId,
    address _owner
  );

  event AppOwnerRemoved (
    string _appId,
    address _owner
  );

  event ClassCreated (
    string _appId,
    string _className
  );

  event ObjectCreated (
    string _appId,
    string _className,
    string _objectId,
    string _objectJSON
  );

  address public owner = msg.sender;
  string[] appsIds;
  mapping(string => App) appById;

  function addAppOwner(string memory _appId, address _owner) public {
    require(bytes(_appId).length > 0, "_appId is required");
    App storage app = appById[_appId];
    require(
      msg.sender == owner || app.owners[msg.sender],
      "This function is restricted to the contract and app owners"
    );
    require(!app.owners[_owner], "The address is already an app owner");
    if (bytes(app.id).length <= 0) {
      app.id = _appId;
      appsIds.push(_appId);
      emit AppCreated(_appId);
    }
    app.owners[_owner] = true;
    emit AppOwnerAdded(_appId, _owner);
  }

  function removeAppOwner(string memory _appId, address _owner) public {
    require(bytes(_appId).length > 0, "_appId is required");
    App storage app = appById[_appId];
    require(
      msg.sender == owner || app.owners[msg.sender],
      "This function is restricted to the contract and app owners"
    );
    require(app.owners[_owner], "The address is not an app owner");
    app.owners[_owner] = false;
    emit AppOwnerRemoved(_appId, _owner);
  }

  function createObject(string memory _appId, string memory _className, string memory _objectId, string memory _objectJSON) public {
    require(bytes(_appId).length > 0, "_appId is required");
    require(bytes(_className).length > 0, "_className is required");
    require(bytes(_objectId).length > 0, "_objectId is required");
    require(bytes(_objectJSON).length > 0, "_objectJSON is required");
    App storage app = appById[_appId];
    require(
      msg.sender == owner || app.owners[msg.sender],
      "This function is restricted to the contract and app owners"
    );
    if (bytes(app.id).length <= 0) {
      app.id = _appId;
      appsIds.push(_appId);
      emit AppCreated(_appId);
    }
    Class storage class = app.classByName[_className];
    if (bytes(class.name).length <= 0) {
      class.name = _className;
      app.classesNames.push(_className);
      emit ClassCreated(_appId, _className);
    }
    require(bytes(class.objectJSONById[_objectId]).length <= 0, "_objectId must be unique");
    class.objectsIds.push(_objectId);
    class.objectJSONById[_objectId] = _objectJSON;
    emit ObjectCreated(_appId, _className, _objectId, _objectJSON);
  }

  function getObjectJSON(string memory _appId, string memory _className, string memory _objectId) public view returns (string memory) {
    string memory objectJSON = appById[_appId].classByName[_className].objectJSONById[_objectId];
    require(bytes(objectJSON).length > 0, "The object does not exist");
    return objectJSON;
  }
}
