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
    }
    Class storage class = app.classByName[_className];
    if (class.objectsIds.length <= 0) {
      app.classesNames.push(_className);
    }
    require(bytes(class.objectJSONById[_objectId]).length <= 0, "_objectId must be unique");
    class.objectsIds.push(_objectId);
    class.objectJSONById[_objectId] = _objectJSON;
  }
}
