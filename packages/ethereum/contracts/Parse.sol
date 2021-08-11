// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract Parse {
  struct Class {
    string[] objectsIds;
    mapping(string => string) objectJSONById;
  }

  struct App {
    string[] classesNames;
    mapping(string => Class) classByName;
  }

  event AppCreated (
    string _appId
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

  function createObject(string memory _appId, string memory _className, string memory _objectId, string memory _objectJSON) public {
    require(msg.sender == owner, "This function is restricted to the contract's owner");
    require(bytes(_appId).length > 0, "_appId is required");
    require(bytes(_className).length > 0, "_className is required");
    require(bytes(_objectId).length > 0, "_objectId is required");
    require(bytes(_objectJSON).length > 0, "_objectJSON is required");
    App storage app = appById[_appId];
    if (app.classesNames.length <= 0) {
      appsIds.push(_appId);
      emit AppCreated(_appId);
    }
    Class storage class = app.classByName[_className];
    if (class.objectsIds.length <= 0) {
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
