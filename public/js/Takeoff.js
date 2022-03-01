/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

// Define method String.replaceAll 
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
  };
}

// the inventory table instance
var packageTable = null;

// the following 2 strings will be used to replace ',' and '\n'
const Enter_Replacement = '\xfe';
const Comma_Replacement = '\xfd';

const Editable_String = "(Editable)";

const Guid_Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ImportDataTypes = {
  CLASSIFICATIONS_IMPORT: 'classifications_import',
  CLASSIFICATION_CREATE: 'classification_create',
  PACKAGE_CREATE: 'package_create'
}

// Data type
const TakeoffDataType = {
  PACKAGES   : 'packages',
  ITEMS : 'items',
  SYSTEMS: 'systems',
  CLASSIFICATIONS: 'classifications'
}

const Systems = {
  System1 : 'CLASSIFICATION_SYSTEM_1',
  System2 : 'CLASSIFICATION_SYSTEM_2'
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//Takeogg Table class that manage the operation to the table
class PackageTable {
  constructor(tableId, rawTableId, projectId, projectHref, currentDataType = TakeoffDataType.PACKAGES, dataSet = []) {
    this.tableId = tableId;
    this.rawTableId = rawTableId;
    this.projectId = projectId;
    this.projectHref = projectHref;
    this.dataSet = dataSet;
    this.rawItemsDataset = [];
    this.systems = {};
    this.items = {};
    this.types = {};
    this.views = {};
    this.rawLocations = [];
    this.locationsMap = {};
    this.packages = [];
    this.currentDataType = currentDataType;
    this.currentDataStyle = null;
    this.isHumanReadable = false;
    this.csvData = [];
    this.packageName = '';
    this.packagesDict = null;
    this.cachedInfo = {
      DataInfo: []
    }
  };

  updatePackageId(){
    this.packageId = this.packagesDict[this.packageName];
  }

  // get the required data for takeoff table
  async fetchDataAsync( takeoffData ) {
    this.dataSet = [];
    try {
      const requestUrl = '/api/forge/takeoff/info';
      const requestData = {
        'projectId': this.projectId,
        'takeoffData': takeoffData,
        'packageId':this.packageId
      };
      switch( takeoffData ){
        case 'packages':{
          //Through this call we're retrieving the available takeoff packages on our project
          let rawPackages = await apiClientAsync(requestUrl, requestData);
          await this.preparePackagesData(rawPackages);
          break;
        };
        case 'items':{
          //Through this call we're retrieving the available takeoff items for a specific package
          let rawItems = await apiClientAsync(requestUrl, requestData);
          this.items = await this.prepareItemsData(rawItems);
          break;
        };
        case 'types':{
          //Through this call we're retrieving the available takeoff types for a specific package
          let rawTypes = await apiClientAsync(requestUrl, requestData);
          this.types = await this.prepareTypesData(rawTypes);
          break;
        };
        case 'systems':{
          //Through this call we're retrieving the available classification systems for a specific project
          let rawSystems = await apiClientAsync(requestUrl, requestData);
          this.systems = await this.prepareSystemsData(rawSystems);
          break;
        };
        case 'views':{
          ////Through this call we're retrieving the available views for a specific project
          let rawViews = await apiClientAsync(requestUrl, requestData);
          this.views = await this.prepareViewsData(rawViews);
          break;
        };
        case 'locations':{
          ////Through this call we're retrieving the available locations for a specific project
          this.rawLocations = await apiClientAsync(requestUrl, requestData);
          this.locationsMap = await this.prepareLocationsData(this.rawLocations);
          break;
        }
      };
      
    } catch (err) {
      console.log(err);
    }
  };

  async prepareLocationsData(rawLocations){
    let locationsMap = {};
    rawLocations.forEach(rawLocation => {
      locationsMap[rawLocation.id] = this.getFullLocationMap(rawLocation);
    });
    return locationsMap;
  }

  getFullLocationMap(rawLocation){
    let fullLocation = [rawLocation.id];
    let currentParentId = rawLocation.parentId;
    while(!!currentParentId){
      fullLocation.push(currentParentId);
      let newParent = this.rawLocations.find(l => l.id === currentParentId);
      currentParentId = newParent.parentId;
    }
    return fullLocation.reverse();
  }

  async prepareViewsData(rawViews){
    let viewsObject = {};
    for(const contentView of rawViews){
      viewsObject[contentView.id] = {
        'type': contentView.type,
        'name': (contentView.type === 'FILE_MODEL' ? contentView.view.viewName : contentView.view.sheetName)
      }
    }
    return viewsObject;
  }

  async prepareSystemsData(rawsystems){
    let systemsObject = {};
    for(const system of rawsystems){
      let newCodes = await this.prepareClassificationsData(system.id);
      systemsObject[system.type] = {
        'name': system.name,
        'id': system.id,
        'codes': newCodes
      }
    }
    return systemsObject;
  }

  async getFullClassificationMap(classificationCode, systemType = Systems.System1){
    let properClassification = this.getProperClassification(classificationCode, systemType);
    let parentCode = properClassification.firstCode.parentCode;
    let fullClassification = [properClassification.firstCode];
    while(!!parentCode){
      let newCode = this.systems[properClassification.systemType].codes.find(el => el.code == parentCode);
      fullClassification.push(newCode);
      parentCode = newCode.parentCode;
    }
    return fullClassification.reverse();
  }

  getProperClassification(classificationCode, systemType = Systems.System1){
    let foundCode =  this.systems[systemType].codes.find(c => c.code == classificationCode);
    return {'systemType': systemType, 'firstCode': foundCode};
  }

  async prepareClassificationsData(systemId){
    const requestUrl = '/api/forge/takeoff/info';
      const requestData = {
        'projectId': this.projectId,
        'takeoffData': 'classifications',
        'packageId':this.packageId,
        'systemId': systemId
      };
    let rawClassifications = await apiClientAsync(requestUrl, requestData);
    return rawClassifications;
  }

  async prepareTypesData(rawTypes){
    let typesObject = {}
    rawTypes.forEach((type) => {
      typesObject[type.id] = {
        'name': type.name,
        'primaryQuantityDefinition': {
          'classificationCodeOne': type.primaryQuantityDefinition.classificationCode,
          'unitOfMeasure': type.primaryQuantityDefinition.unitOfMeasure
        }
      }
    })
    return typesObject;
  }

  async prepareItemsData(rawItems){
    let itemsObject = {
      'byClassificationSystem1': {},
      'byClassificationSystem2': {},
      'byContentView': {},
      'byTakeoffTypeId': {},
      'byLocationId': {},
      'rawItemsPrimaryQ': {},
      'rawItemsSecondaryQ': {}
    };
    for(const item of rawItems){
      //adjust raw items
      itemsObject.rawItemsPrimaryQ[item.id] = {
        'Takeoff Name': item.type + ' TYPE',
        'Classification 1': item.primaryQuantity.classificationCodeOne,
        'Classification 2': item.primaryQuantity.classificationCodeTwo,
        'Document': item.contentView.id,
        'Location': item.locationId,
        'ID': item.id,
        'Type': item.type,
        'Output Name': item.primaryQuantity.outputName,
        'Quantity': item.primaryQuantity.quantity,
        'Unit of Measure': item.primaryQuantity.unitOfMeasure,
      };
      let secondaryQuantities = item.secondaryQuantities[0];
      //now we remove those unassigned by 2 classifications
      if(!!secondaryQuantities){
        itemsObject.rawItemsSecondaryQ[item.id] = {
          'Takeoff Name': item.type + ' TYPE',
          'Classification 1': secondaryQuantities ? secondaryQuantities.classificationCodeOne : 'Unassigned',
          'Classification 2': secondaryQuantities ? secondaryQuantities.classificationCodeTwo : 'Unassigned',
          'Document': item.contentView.id,
          'Location': item.locationId,
          'ID': item.id,
          'Type': item.type,
          'Output Name': secondaryQuantities ? secondaryQuantities.outputName : 'Unassigned',
          'Quantity': secondaryQuantities ? secondaryQuantities.quantity : 'Unassigned',
          'Unit of Measure': secondaryQuantities ? secondaryQuantities.unitOfMeasure : 'Unassigned',
        };
      }

      //adjust by location
      if (itemsObject.byLocationId[item.locationId] == null){
        itemsObject.byLocationId[item.locationId] = {
          'byTakeoffType': {},
          'count': 0,
          'quantity': 0,
          'unitOfMeasure': item.primaryQuantity.unitOfMeasure,
          'classificationCodeOne': item.primaryQuantity.classificationCodeOne,
          // 'contentView': item.contentView.id
        }
      };
      itemsObject.byLocationId[item.locationId].count += 1;
      itemsObject.byLocationId[item.locationId].quantity += item.primaryQuantity.quantity;
      if (itemsObject.byLocationId[item.locationId].byTakeoffType[item.takeoffTypeId] == null){
        itemsObject.byLocationId[item.locationId].byTakeoffType[item.takeoffTypeId] = this.getItemObject(item);
      }
      itemsObject.byLocationId[item.locationId].byTakeoffType[item.takeoffTypeId].count += 1;
      itemsObject.byLocationId[item.locationId].byTakeoffType[item.takeoffTypeId].quantity += item.primaryQuantity.quantity;


      //adjust by takeofftypeid
      if (itemsObject.byTakeoffTypeId[item.takeoffTypeId] == null){
        itemsObject.byTakeoffTypeId[item.takeoffTypeId] = this.getItemObject(item);
      };
      itemsObject.byTakeoffTypeId[item.takeoffTypeId].count += 1;
      itemsObject.byTakeoffTypeId[item.takeoffTypeId].quantity += item.primaryQuantity.quantity;
      if (itemsObject.byTakeoffTypeId[item.takeoffTypeId].contentView != item.contentView.id){
        itemsObject.byTakeoffTypeId[item.takeoffTypeId].contentView = '';
      }

      //adjust by contentview
      if (itemsObject.byContentView[item.contentView.id] == null){
        itemsObject.byContentView[item.contentView.id] = {
          'byTakeoffType': {},
          'count': 0,
          'quantity': 0,
          'unitOfMeasure': item.primaryQuantity.unitOfMeasure
        }
      }
      itemsObject.byContentView[item.contentView.id].count += 1;
      itemsObject.byContentView[item.contentView.id].quantity += item.primaryQuantity.quantity;
      if (itemsObject.byContentView[item.contentView.id].byTakeoffType[item.takeoffTypeId] == null){
        itemsObject.byContentView[item.contentView.id].byTakeoffType[item.takeoffTypeId] = this.getItemObject(item);
      }
      itemsObject.byContentView[item.contentView.id].byTakeoffType[item.takeoffTypeId].count += 1;
      itemsObject.byContentView[item.contentView.id].byTakeoffType[item.takeoffTypeId].quantity += item.primaryQuantity.quantity;

      //adjust by Classification System 1 from PrimaryQuantity
      if (itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne] == null){
        itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne] = {
          'byTakeoffType': {},
          'count': 0,
          'quantity': 0,
          'unitOfMeasure': item.primaryQuantity.unitOfMeasure,
          'classificationCodeOne': item.primaryQuantity.classificationCodeOne,
          // 'contentView': item.contentView.id
        }
      };
      itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne].count += 1;
      itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne].quantity += item.primaryQuantity.quantity;
      if (itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne].byTakeoffType[item.takeoffTypeId] == null){
        itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne].byTakeoffType[item.takeoffTypeId] = this.getItemObject(item);
      }
      itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne].byTakeoffType[item.takeoffTypeId].count += 1;
      itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne].byTakeoffType[item.takeoffTypeId].quantity += item.primaryQuantity.quantity;

      //adjust by Classification System 2 from SecondaryQuantities
      for(const secondaryQuantity of item.secondaryQuantities){
        if (itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo] == null){
          itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo] = {
            'byTakeoffType': {},
            'count': 0,
            'quantity': 0,
            'unitOfMeasure': secondaryQuantity.unitOfMeasure,
            'classificationCodeTwo': secondaryQuantity.classificationCodeTwo,
            'classificationCodeOne': item.primaryQuantity.classificationCodeOne
          }
        };
        itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo].count += 1;
        itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo].quantity += secondaryQuantity.quantity;
        if (itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo].byTakeoffType[item.takeoffTypeId] == null){
          itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo].byTakeoffType[item.takeoffTypeId] = this.getItemObject(item);
        }
        itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo].byTakeoffType[item.takeoffTypeId].count += 1;
        itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo].byTakeoffType[item.takeoffTypeId].quantity += secondaryQuantity.quantity;
      }
    }

    return itemsObject;
  }

  getItemObject(item){
    return {
      'count': 0,
      'quantity': 0,
      'unitOfMeasure': item.primaryQuantity.unitOfMeasure,
      'classificationCode': item.primaryQuantity.classificationCodeOne
    }
  }

  async preparePackagesData(rawPackages){
    let packagesArray = [];
    let packagesDict = {};
    rawPackages.forEach((rawPackage) => {
      packagesArray.push({
        'name': rawPackage.name,
        'updatedByName': rawPackage.updatedByName,
        'updatedAt': rawPackage.updatedAt
      });
      packagesDict[rawPackage.name] = rawPackage.id;
    });
    this.packages = packagesArray;
    this.packagesDict = packagesDict;
  }

  // prepare|customize the data to be displayed in the takeoff table
  async polishDataOfCurrentDataTypeAsync() {
    if(this.CurrentDataType == TakeoffDataType.ITEMS){
      try{
        let orderBy = $('#group_by').find(":selected").val();
        switch( orderBy ){
          case 'primaryclassification':{
            await this.adjustClassificationSystem1Data();
            break;
          };
          case 'secondaryclassification':{
            await this.adjustClassificationSystem2Data();
            break;
          };
          case 'document':{
            await this.adjustDocumentData();
            break;
          };
          case 'takeofftype':{
            await this.adjustTypeData();
            break;
          }
          case 'location':{
            await this.adjustLocationData();
            break;
          }
        }

        await this.adjustRawItemsData();

        this.csvData = this.prepareCSVData();
        
      }
      catch(err){
        console.log(err);
      }
    }

    if(this.CurrentDataType == TakeoffDataType.CLASSIFICATIONS){
      let classificationName = $('input[name="listRadio"]:checked').val();
      this.dataSet = Object.values(this.systems).find( o => o.name === classificationName).codes;
      this.csvData = this.prepareCSVData();
    }
  };

  async adjustLocationData(){
    let byLocationArray = [];

    //here we iterate through all locationIds available
    for(const locationId of Object.keys(this.items.byLocationId)){
      let currentItem = this.items.byLocationId[locationId];
      let fullLocationId = this.locationsMap[locationId] || [null];
      let insertIndex = 0;
      //Now we'll create or increment items for each location based on locationId hierarchy (considering all of the parents)
      for(const currentlocationId of fullLocationId){
        let locationName = !!currentlocationId ? this.rawLocations.find(l => l.id === currentlocationId).name :'Unassigned';
        //Here we check if the classification already exists
        let checkItem = byLocationArray.find(item => item.name === `${locationName}`);
        if(!!checkItem){
          checkItem.quantity = parseFloat(checkItem.quantity);
          checkItem.quantity += currentItem.quantity;
          checkItem.quantity = checkItem.quantity.toFixed(2);
          checkItem.count += currentItem.count;
          checkItem.classification = '';
          insertIndex = byLocationArray.findIndex(item => item === checkItem) + 1;
        }
        // If not, we add as a new item
        else{
          let newItem = {
            'name': locationName,
            'count': currentItem.count,
            'quantity': currentItem.quantity,
            'unit': currentItem.unitOfMeasure,
            'classification': '',
            // 'document': currentItem.contentView
          }
          if(this.humanReadableData){
            // here we override its values in case human readable is recquired
            newItem.quantity = newItem.quantity.toFixed(2);
          }
          // byLocationArray.push(newItem);
          byLocationArray.splice(insertIndex, 0, newItem);
          insertIndex += 1;
        }
      }
      let locationByTakeoffType = currentItem.byTakeoffType;
      for(const takeoffTypeId of Object.keys(locationByTakeoffType)){
        let codeObject = this.getProperClassification(currentItem.byTakeoffType[takeoffTypeId].classificationCode);
        let currenType = locationByTakeoffType[takeoffTypeId];
        // Here we prepare each new item to the table
        let newItem = {
          'name': takeoffTypeId,
          'count': currenType.count,
          'quantity': currenType.quantity,
          'unit': currenType.unitOfMeasure,
          'classification': `${codeObject.firstCode.code}`,
          // 'document': currenType.contentView
        }
        if(this.humanReadableData){
          // here we override its values in case human readable is recquired
          newItem.name = this.types[takeoffTypeId].name,
          newItem.quantity = newItem.quantity.toFixed(2);
          newItem.classification +=  ` - ${codeObject.firstCode.description}`;
        }
        // here we add the new item based on its classification
        byLocationArray.splice(insertIndex, 0, newItem); 
      }
    }

    this.dataSet = byLocationArray;
  }

  async adjustRawItemsData(){
    let rawItemsArray = [];

    //Here we iterate through primary quantities of each item
    for(const itemId of Object.keys(this.items.rawItemsPrimaryQ)){
      // here we replace the document id by it's name
      this.items.rawItemsPrimaryQ[itemId].Document = this.views[this.items.rawItemsPrimaryQ[itemId].Document].name;
      rawItemsArray.push(
        this.items.rawItemsPrimaryQ[itemId]
      )
    }

    //Here we iterate through secondary quantities of each item
    for(const itemId of Object.keys(this.items.rawItemsSecondaryQ)){
      // here we replace the document id by it's name
      this.items.rawItemsSecondaryQ[itemId].Document = this.views[this.items.rawItemsSecondaryQ[itemId].Document].name;
      rawItemsArray.push(
        this.items.rawItemsSecondaryQ[itemId]
      )
    }
    this.rawItemsDataset = rawItemsArray;
  }

  async adjustClassificationSystem2Data(){
    let byClassificationSystem2Array = [];

    //Here we iterate through classification code 2
    for(const classificationCodeTwo of Object.keys(this.items.byClassificationSystem2)){
      let currentItem = this.items.byClassificationSystem2[classificationCodeTwo];
      let fullClassification2 = await this.getFullClassificationMap(classificationCodeTwo, Systems.System2);
      let classification1 = await this.getProperClassification(currentItem.classificationCodeOne);
      let insertIndex = 0;
      //Now we'll create or increment items for each classification based on classificationCodeTwo hierarchy (considering all of the parents)
      for(const classification2 of fullClassification2){
        //Here we check if the classification already exists
        let checkItem = byClassificationSystem2Array.find(item => item.name === `${classification2.code} - ${classification2.description}`);
        if(!!checkItem){
          checkItem.quantity = parseFloat(checkItem.quantity);
          checkItem.quantity += currentItem.quantity;
          checkItem.quantity = checkItem.quantity.toFixed(2);
          checkItem.count += currentItem.count;
          (`${classification1.firstCode.code} - ${classification1.firstCode.description}` === checkItem.classification ? null : checkItem.classification = '' );
          insertIndex = byClassificationSystem2Array.findIndex(item => item === checkItem) + 1;
        }
        // If not, we add as a new item
        else{
          let newItem = {
            'name': classification2.code,
            'count': currentItem.count,
            'quantity': currentItem.quantity,
            'unit': currentItem.unitOfMeasure,
            'classification': classification1.firstCode.code,
            // 'document': currentItem.contentView
          }
          if(this.humanReadableData){
            // here we override its values in case human readable is recquired
            newItem.name += ` - ${classification2.description}`;
            newItem.quantity = newItem.quantity.toFixed(2);
            newItem.classification +=  ` - ${classification1.firstCode.description}`;
          }
          byClassificationSystem2Array.push(newItem);
          insertIndex = byClassificationSystem2Array.length;
        }
      }
      let system2ByTakeoffType = currentItem.byTakeoffType;

      //Now we iterate through takeoff types
      for(const takeoffTypeId of Object.keys(system2ByTakeoffType)){
        let currenType = system2ByTakeoffType[takeoffTypeId];
        let byTakeoffClassification = await this.getProperClassification(currenType.classificationCode);
        // Here we prepare each new item to the table
        let newItem = {
          'name': takeoffTypeId,
          'count': currenType.count,
          'quantity': currenType.quantity,
          'unit': currenType.unitOfMeasure,
          'classification': byTakeoffClassification.firstCode.code,
          // 'document': currenType.contentView
        }
        if(this.humanReadableData){
          // here we override its values in case human readable is recquired
          newItem.name = this.types[takeoffTypeId].name,
          newItem.quantity = newItem.quantity.toFixed(2);
          newItem.classification +=  ` - ${byTakeoffClassification.firstCode.description}`;
        }
        // here we add the new item based on its classification
        byClassificationSystem2Array.splice(insertIndex, 0, newItem);
      }
    }

    this.dataSet = byClassificationSystem2Array;
  }

  async adjustClassificationSystem1Data(){
    let byClassificationSystem1Array = [];

    //Here we iterate through classification code 1
    for(const classificationCodeOne of Object.keys(this.items.byClassificationSystem1)){
      let currentItem = this.items.byClassificationSystem1[classificationCodeOne];
      let fullClassification1 = await this.getFullClassificationMap(classificationCodeOne);
      let lastClassification1 = fullClassification1[fullClassification1.length - 1];
      let insertIndex = 0;
      //Now we'll create or increment items for each classification based on classificationCodeOne hierarchy (considering all of the parents)
      for(const classification1 of fullClassification1){
        //Here we check if the classification already exists
        let checkItem = byClassificationSystem1Array.find(item => item.name === `${classification1.code} - ${classification1.description}`);
        if(!!checkItem){
          checkItem.quantity = parseFloat(checkItem.quantity);
          checkItem.quantity += currentItem.quantity;
          checkItem.quantity = checkItem.quantity.toFixed(2);
          checkItem.count += currentItem.count;
          (`${classification1.code} - ${classification1.description}` === checkItem.classification ? null : checkItem.classification = '' );
          insertIndex = byClassificationSystem1Array.findIndex(item => item === checkItem) + 1;
        }
        // If not, we add as a new item
        else{
          let newItem = {
            'name': classification1.code,
            'count': currentItem.count,
            'quantity': currentItem.quantity,
            'unit': currentItem.unitOfMeasure,
            'classification': lastClassification1.code,
            // 'document': currentItem.contentView
          }
          if(this.humanReadableData){
            // here we override its values in case human readable is recquired
            newItem.name += ` - ${classification1.description}`;
            newItem.quantity = newItem.quantity.toFixed(2);
            newItem.classification +=  ` - ${lastClassification1.description}`;
          }
          byClassificationSystem1Array.push(newItem);
          insertIndex = byClassificationSystem1Array.length;
        }
      }
      let system1ByTakeoffType = currentItem.byTakeoffType;

      //Now we iterate through takeoff types
      for(const takeoffTypeId of Object.keys(system1ByTakeoffType)){
        let currenType = system1ByTakeoffType[takeoffTypeId];
        // Here we prepare each new item to the table
        let newItem = {
          'name': takeoffTypeId,
          'count': currenType.count,
          'quantity': currenType.quantity,
          'unit': currenType.unitOfMeasure,
          'classification': lastClassification1.code,
        }
        if(this.humanReadableData){
          // here we override its values in case human readable is recquired
          newItem.name = this.types[takeoffTypeId].name,
          newItem.quantity = newItem.quantity.toFixed(2);
          newItem.classification +=  ` - ${lastClassification1.description}`;
        }
        // here we add the new item based on its classification
        byClassificationSystem1Array.splice(insertIndex, 0, newItem);
      }
    }

    this.dataSet = byClassificationSystem1Array;
  }

  async adjustDocumentData(){
    let byDocumentArray = [];

    //Here we iterate through Content View Ids
    for(const contentViewId of Object.keys(this.items.byContentView)){
      let currentItem = this.items.byContentView[contentViewId];

      if(this.humanReadableData){
        byDocumentArray.push({
          'name': this.views[contentViewId].name,
          'count': currentItem.count,
          'quantity': currentItem.quantity.toFixed(2),
          'unit': currentItem.unitOfMeasure,
          'classification': '',
          'document': this.views[contentViewId].name
        })

        //Now we iterate through takeoff types
        for(const takeoffTypeId of Object.keys(currentItem.byTakeoffType)){
          let codeObject = this.getProperClassification(currentItem.byTakeoffType[takeoffTypeId].classificationCode);
          byDocumentArray.push({
            'name': this.types[takeoffTypeId].name,
            'count': currentItem.byTakeoffType[takeoffTypeId].count,
            'quantity': currentItem.byTakeoffType[takeoffTypeId].quantity.toFixed(2),
            'unit': currentItem.byTakeoffType[takeoffTypeId].unitOfMeasure,
            'classification': `${codeObject.firstCode.code} - ${codeObject.firstCode.description}`,
            'document': this.views[contentViewId].name
          })
        }
      }
      else{
        byDocumentArray.push({
          'name': contentViewId,
          'count': currentItem.count,
          'quantity': currentItem.quantity,
          'unit': currentItem.unitOfMeasure,
          'classification': '',
          'document': contentViewId
        })
        for(const takeoffTypeId of Object.keys(currentItem.byTakeoffType)){
          byDocumentArray.push({
            'name': takeoffTypeId,
            'count': currentItem.byTakeoffType[takeoffTypeId].count,
            'quantity': currentItem.byTakeoffType[takeoffTypeId].quantity,
            'unit': currentItem.byTakeoffType[takeoffTypeId].unitOfMeasure,
            'classification': currentItem.byTakeoffType[takeoffTypeId].classificationCode,
            'document': currentItem.byTakeoffType[takeoffTypeId].contentView
          })
        }
      }
      
    }

    this.dataSet = byDocumentArray;
  }

  async adjustTypeData(){
    let byTakeofftypeArray = [];

    //Here we iterate through takeoff types
    for(const takeoffTypeId of Object.keys(this.items.byTakeoffTypeId)){
      
      let currentItem = this.items.byTakeoffTypeId[takeoffTypeId];
      if (this.humanReadableData){
        let codeObject = this.getProperClassification(currentItem.classificationCode);
        byTakeofftypeArray.push({
          'name': this.types[takeoffTypeId].name,
          'count': currentItem.count,
          'quantity': currentItem.quantity.toFixed(2),
          'unit': currentItem.unitOfMeasure,
          'classification': `${codeObject.firstCode.code} - ${codeObject.firstCode.description}`
        })
      }
      else{
        byTakeofftypeArray.push({
          'name': takeoffTypeId,
          'count': currentItem.count,
          'quantity': currentItem.quantity,
          'unit': currentItem.unitOfMeasure,
          'classification': currentItem.classificationCode,
        })
      }
    }

    this.dataSet = byTakeofftypeArray;
  }

  // raw data or human readable data
  set IsHumanReadable(isHumanReadable = fasle) {
    this.humanReadableData = isHumanReadable;
  };

  // get current takeoff data type 
  get CurrentDataType(){
    return this.currentDataType;
  }

  // set current takeoff data type
  set CurrentDataType(dataType = TakeoffDataType.PACKAGES) {
    this.currentDataType = dataType;
    switch (this.currentDataType) {
      case TakeoffDataType.PACKAGES: {
        this.tableId = '#mainTable';
        break;
      }
      case TakeoffDataType.ITEMS: {
        this.tableId = '#mainTable';
        this.rawTableId = '#secondaryTable';
        break;
      }
      case TakeoffDataType.SYSTEMS: {
        this.tableId = '#mainTable';
        break;
      }
    }
  };

  // current table id
  set CurrentTableId(newTableId) {
    this.tableId = newTableId;
  };

  addPackagesToPage(){
    // $('#list').empty();
    for(const newPackage of this.packages.sort((a,b) => (a.name > b.name ? 1 : -1))){
      $('#list').append(
        `<div class="input-group" ><input type='radio'  name='listRadio' value='${newPackage.name}' checked><label style='' white-space: nowrap;'>&#160;${newPackage.name}</label></div><br>`
      );
    }
  }

  addSystemsToPage(){
    // $('#list').empty();
    for(const newSystem of Object.values(this.systems).sort((a,b) => (a.name > b.name ? 1 : -1))){
      $('#list').append(
        `<div class="input-group systems_div"><input type='radio' name='listRadio' value='${newSystem.name}' checked><label style='' white-space: nowrap;'>&#160;${newSystem.name}</label><span class='classification_system'>${Object.keys(this.systems).find(key => this.systems[key]==newSystem)}</span></div><br>`
      );
    }
  }

  // draw the takeoff table based on the current data
  drawTakeoffTable() {

    let dataset = [];
    let rawItemsDataset = [];

    switch(this.currentDataType){
      case TakeoffDataType.PACKAGES: {
        this.addPackagesToPage();
        break;
      }
      case TakeoffDataType.SYSTEMS: {
        this.addSystemsToPage();
        break;
      }
      case TakeoffDataType.ITEMS: {
        dataset = this.dataSet;
        rawItemsDataset = this.rawItemsDataset;
        break;
      }
      case TakeoffDataType.CLASSIFICATIONS: {
        dataset = this.dataSet;
        break;
      }
    }

    let columns = this.getColumns(dataset);
    let rawColumns = this.getRawItemsColumns(rawItemsDataset);

    //First we setup the main table
    $(this.tableId).bootstrapTable('destroy');

    $(this.tableId).bootstrapTable({
      data: dataset,
      editable: true,
      clickToSelect: true,
      cache: false,
      showToggle: false,
      showPaginationSwitch: true,
      pagination: true,
      pageList: [5, 10, 25, 50, 100],
      pageSize: 10,
      pageNumber: 1,
      uniqueId: 'items',
      striped: true,
      search: true,
      showRefresh: true,
      minimumCountColumns: 2,
      smartDisplay: true,
      columns: columns,
      multipleSelectRow: false,
      singleSelect: true,
      checkboxHeader: true
    });

    //Then we setup the raw items table
    $(this.rawTableId).bootstrapTable('destroy');

    $(this.rawTableId).bootstrapTable({
      data: rawItemsDataset,
      editable: true,
      clickToSelect: true,
      cache: false,
      showToggle: false,
      showPaginationSwitch: true,
      pagination: true,
      pageList: [5, 10],
      pageSize: 5,
      pageNumber: 1,
      uniqueId: 'rawItems',
      striped: true,
      search: true,
      showRefresh: true,
      minimumCountColumns: 2,
      smartDisplay: true,
      columns: rawColumns,
      multipleSelectRow: false,
      singleSelect: true,
      checkboxHeader: true
    });
    
  };

  getRawItemsColumns(rawItemsDataset){
    let rawColumns = [];
    if (rawItemsDataset.length !== 0) {
      for (var key in rawItemsDataset[0]) {
        rawColumns.push({
          field: key,
          title: key,
          align: "center"
        })
      }
    }

    return rawColumns;
  }

  getColumns(dataset){
    let columns = [];
    if (dataset.length !== 0) {
      for (var key in dataset[0]) {
        columns.push({
          field: key,
          title: key,
          align: "center"
        })
      }
    }

    return columns;
  }

  async importCSV(importOption){
    const { value: file } = await Swal.fire({
      title: 'Select csv file',
      input: 'file',
      inputAttributes: {
        'accept': '.csv',
        'aria-label': 'Upload your csv for configuration'
      },
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Import Classification'
    })

    if (file) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        let lines = e.target.result.split('\n');
        lines.shift();
        let classifications = [];
        let classificationName = $('input[name="listRadio"]:checked').val();
        let systemId = Object.values(this.systems).find(v => v.name === classificationName).id;
        for(const line of lines){
          let newclassObject = this.textToObject(line);
          if(!!newclassObject.code)
            classifications.push(newclassObject);
        }
        let responseBody = {
          body: 'No change!'
        };
        switch (importOption) {
          case 'updateclassifications':
            responseBody = await this.updateClassifications(classifications, systemId, classificationName);
            break;
          case 'createclassification':
            const inputOptions = new Promise((resolve) => {
              setTimeout(() => {
                resolve({
                  'CLASSIFICATION_SYSTEM_1' : 'SYSTEM 1',
                  'CLASSIFICATION_SYSTEM_2' : 'SYSTEM 2'
                })
              }, 500)
            })
            
            const { value: systemType } = await Swal.fire({
              title: 'Select a System Type',
              input: 'radio',
              inputOptions: inputOptions,
              inputValidator: (value) => {
                if (!value) {
                  return 'You need to choose a System Type!'
                }
              }
            })
            
            if (systemType) {
              const { value: classificationName } = await Swal.fire({
                title: 'Now enter a name for the classification system',
                input: 'text',
                showCancelButton: true,
                inputValidator: (value) => {
                  if (!value) {
                    return 'You need to write something!'
                  }
                }
              })
              if (classificationName) {
                responseBody = await this.createClassification(classifications, systemType, classificationName);
              }
            }
            // responseBody = await this.createClassification(classifications, );
            break;
        }
        Swal.fire({
          title: 'Status of the Update/Creation',
          text: JSON.stringify(responseBody.statusCode != 200 ? responseBody: responseBody.body),
          showCancelButton: false,
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'OK'
        })
        if(responseBody.statusCode === 200)
          $('#btnRefresh').click();
      }
      reader.readAsBinaryString(file)
    }
  }

  async createPackage(packageName){
    const requestUrl = '/api/forge/takeoff/info';
    const requestData = {
      'projectId': this.projectId,
      'takeoffData': ImportDataTypes.PACKAGE_CREATE,
      'packageName': packageName
    };
    let response = await apiClientAsync(requestUrl, requestData, 'post');
    return response;
  }

  async createClassification(classifications, systemType, classificationName){
    const requestUrl = '/api/forge/takeoff/info';
    const requestData = {
      'projectId': this.projectId,
      'takeoffData': ImportDataTypes.CLASSIFICATION_CREATE,
      'classificationName': classificationName,
      'systemType': systemType,
      'classifications': classifications
    };
    let response = await apiClientAsync(requestUrl, requestData, 'post');
    return response;
  }

  async updateClassifications(classifications, systemId, classificationName){

    const requestUrl = '/api/forge/takeoff/info';
    const requestData = {
      'projectId': this.projectId,
      'takeoffData': ImportDataTypes.CLASSIFICATIONS_IMPORT,
      'classificationName': classificationName,
      'systemId': systemId,
      'classifications': classifications
    };
    let response = await apiClientAsync(requestUrl, requestData, 'post');
    return response;
  }

  textToObject(line){
    let parameters = line.split(',');
    if(parameters.length != 4){
      return {};
    }
    return {
      parentCode: parameters[0] || null,
      code: parameters[1] || null,
      description: parameters[2] || null,
      measurementType: parameters[3] || null
    }
  }

  // export data in takeoff table to CSV file
  async exportCSV() {
    let csvDataCleared = await cleanForCommas(this.csvData);
    let csvString = csvDataCleared.join("%0A");
    let a = document.createElement('a');
    a.href = 'data:attachment/csv,' + csvString;
    a.target = '_blank';
    a.download = this.currentDataType + (new Date()).getTime()+ '.csv';
    document.body.appendChild(a);
    a.click();
  }

  // protected: get the data cached to be exported to CSV later
  prepareCSVData() {

    let exportOption = getImportExportOption();
    let csvRows = [];
    let csvHeader = (exportOption === ExportImportOptions.EXPORTALLITEMS ? ['Package Name' ] : []);

    // Set the header of CSV
    for (var key in this.dataSet[0]) {
      csvHeader.push(key);
    }
    csvRows.push(csvHeader);

    // Set the row data of CSV
    this.dataSet.forEach((item) => {
      let csvRowTmp = (exportOption === ExportImportOptions.EXPORTALLITEMS ? [this.packageName] : []);
      for (key in item) {
        csvRowTmp.push( item[key] );
      }
      csvRows.push(csvRowTmp);
    })
    return csvRows;
  };

  async refreshTable() {

    this.IsHumanReadable = isHumanReadable();

    if(!packageTable.packageName || $('#listTitle').html() == 'PACKAGES'){
      let orderBy = $('#group_by').find(":selected").val();
      switch (orderBy) {
        case 'primaryclassification':
          await this.adjustClassificationSystem1Data();
          break;
        case 'secondaryclassification':
          await this.adjustClassificationSystem2Data();
          break;
        case 'document':
          await this.adjustDocumentData();
          break;
        case 'takeofftype':
          await this.adjustTypeData();
          break;
        case 'location':
          await this.adjustLocationData();
          break;
      }
    }
    else{
      let classificationName = $('input[name="listRadio"]:checked').val();
      this.dataset = Object.values(this.systems).find( o => o.name === classificationName).codes;
    }

    this.csvData = this.prepareCSVData();

    let tableColumns = this.getColumns(this.dataSet);

    $(this.tableId).bootstrapTable('refreshOptions', {
        data: this.dataSet,
        columns: tableColumns
    });
  }

}

async function cleanForCommas(csvData){
  let clearedCsvData = [];
  for(const row of csvData){
    let auxRow = [];
    for(const rowItem of row){
      auxRow.push(typeof rowItem === "string" ? rowItem.replaceAll(',',' ') : rowItem);
    }
    clearedCsvData.push(auxRow);
  }
  return clearedCsvData;
}

async function downloadAllCSV(csvData) {
  let csvDataCleared = await cleanForCommas(csvData);
  let csvString = csvDataCleared.join("%0A");
  let a = document.createElement('a');
  a.href = 'data:attachment/csv,' + csvString;
  a.target = '_blank';
  a.download = 'AllTakeoffData' + (new Date()).getTime()+ '.csv';
  document.body.appendChild(a);
  a.click();
}

async function exportAllCSV(){
  let csvData = [];
  $('#executeCSV').hide();
  $('.importInProgress').show();
  //Here we iterate through the packages available and append their csvs to csvData for extraction
  for(const packageData of packageTable.packages){
    let temporaryTable = new PackageTable('', '', $('#labelProjectId').text(), $('#labelProjectHref').text(), TakeoffDataType.ITEMS);
    temporaryTable.systems = packageTable.systems;
    temporaryTable.views = packageTable.views;
    temporaryTable.packagesDict = packageTable.packagesDict;
    temporaryTable.packageName = packageData.name;
    temporaryTable.updatePackageId();
    temporaryTable.IsHumanReadable = isHumanReadable();
    dataFetchs = ['items','types'];
    for(const data of dataFetchs){
      await temporaryTable.fetchDataAsync(data);
    }
    await temporaryTable.polishDataOfCurrentDataTypeAsync();
    csvData = (temporaryTable.csvData.length > 1? csvData.concat(temporaryTable.csvData) : csvData);
  }
  downloadAllCSV(csvData);
  $('#executeCSV').show();
  $('.importInProgress').hide();
}

function isHumanReadable(){
  //we're returning always true as we already have the raw table
  return true;
  // return $('input[name="dataTypeToDisplay"]:checked').val() === 'humanReadable'
}

//Here we check if the proper data was acquired for being exported
function checkForPackageData(){
  // Export the current table
  if( !packageTable || !packageTable.csvData ){
    alert('Please get the data first.')
    return false;
  }
  return true;
}

// Event when DOM tree is ready
$(document).ready(function () {

  $('#executeCSV').click(function () {

    exportImportOption = getImportExportOption();
    switch( exportImportOption ){
      case ExportImportOptions.EXPORTCURRENTTABLE:{
        if(checkForPackageData())
          packageTable.exportCSV();
        break;
      };
      case ExportImportOptions.EXPORTALLITEMS:{
        if(checkForPackageData())
          exportAllCSV(); 
        break;
      };
      case ExportImportOptions.UPDATECLASSIFICATIONS:{
        if(checkForPackageData())
          packageTable.importCSV(exportImportOption);
        break;
      }
      case ExportImportOptions.CREATECLASSIFICATION:{
        packageTable.importCSV(exportImportOption);
        break;
      }
    }
  });

  $('#addPackage').click(async () => {
    const { value: packageName } = await Swal.fire({
      title: 'Enter a name for the new Package',
      input: 'text',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'You need to write something!'
        }
      }
    })
    if (packageName) {
      responseBody = await packageTable.createPackage(packageName);
      Swal.fire({
        title: 'Status of the package creation',
        text: JSON.stringify(responseBody.statusCode != 200 ? responseBody: responseBody.body),
        showCancelButton: false,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK'
      });
      if(responseBody.statusCode === 200)
          $('#btnRefresh').click();
    }
  });

  $('#btnRefresh').click(async () => {
    const projectHref = $('#labelProjectHref').text();
    const projectId = $('#labelProjectId').text();
    if (projectHref === '' || projectId === '') {
      alert('please select one project!');
      return;
    }

    let dataFetchs;
    packageTable.IsHumanReadable = isHumanReadable();
    //Here we grab the package/classification name
    packageTable.packageName = $('input[name="listRadio"]:checked').val();

    // here we get the active tab
    const activeTab = $("ul#takeoffTableTabs li.active").children()[0].hash;
    switch( activeTab ){
      case '#items':{
        $('#group_by').show();
        //in case the tab is for package items, we check if we need to obtain packages, systems, views and locations
        //this is needed when we come from classifications tab, change the package or change the project
        if(!packageTable.packageName || $('#listTitle').html() == 'CLASSIFICATION SYSTEMS'){
          $('#list').empty();
          packageTable.CurrentDataType = TakeoffDataType.PACKAGES;
          dataFetchs = ['packages','systems', 'views', 'locations'];
        }
        else{
          packageTable.updatePackageId();
          packageTable.CurrentDataType = TakeoffDataType.ITEMS;
          dataFetchs = ['types', 'items'];
        }
        $('#listTitle').html('PACKAGES');
        $('#addPackage').show();
        $('#tablesTitle').html('INVENTORY');
        break;
      }
      case '#classificationsystems':{
        $('#group_by').hide();
        if(!packageTable.packageName || $('#listTitle').html() == 'PACKAGES'){
          $('#list').empty();
          packageTable.CurrentDataType = TakeoffDataType.SYSTEMS;
          // dataFetchs = ['systems', 'views'];
        }
        else{
          packageTable.CurrentDataType = TakeoffDataType.CLASSIFICATIONS;
        }
        dataFetchs = ['systems', 'views'];
        $('#listTitle').html('CLASSIFICATION SYSTEMS');
        $('#addPackage').hide();
        $('#tablesTitle').html('CLASSIFICATIONS');
        break;
      }
    }

    $('.clsInProgress').show();
    $('.clsResult').hide();

    try{
      for(const data of dataFetchs){
        await packageTable.fetchDataAsync(data);
      }
    }catch(err){
      console.log(err);
    }

    await packageTable.polishDataOfCurrentDataTypeAsync();
    packageTable.drawTakeoffTable();

    $('.clsInProgress').hide();
    $('.clsResult').show();
  })

});

//Function to return option selected (import or export)
function getImportExportOption(){
  return $('input[name="exportimport"]:checked').val();
}

// helper function for Request
function apiClientAsync( requestUrl, requestData=null, requestMethod='get' ) {
  let def = $.Deferred();

  if( requestMethod == 'post' ){
    requestData = JSON.stringify(requestData);
  }

  jQuery.ajax({
    url: requestUrl,
    contentType: 'application/json',
    type: requestMethod,
    dataType: 'json',
    data: requestData,
    success: function (res) {
      def.resolve(res);
    },
    error: function (err) {
      console.error('request failed:');
      def.reject(err)
    }
  });
  return def.promise();
}

