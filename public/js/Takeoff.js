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

var exportOption;

// Data type
const TakeoffDataType = {
  PACKAGES   : 'packages',
  ITEMS : 'items'
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
    this.packages = [];
    this.currentDataType = currentDataType;
    this.currentDataStyle = null;
    this.isHumanReadable = false;
    this.csvData = null;
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
      };
      
    } catch (err) {
      console.log(err);
    }
  };

  async prepareViewsData(rawViews){
    let viewsObject = {};
    for(const contentView of rawViews){
      viewsObject[contentView.id] = {
        'type': contentView.type,
        'name': (contentView.type === '3D' ? contentView.view.viewName : contentView.view.sheetName)
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
      'rawItems': {}
    };
    for(const item of rawItems){
      //adjust raw items
      itemsObject.rawItems[item.id] = {
        'Takeoff Name': item.type + ' TYPE',
        'Primary Quantity': item.primaryQuantity.quantity,
        'Primary Unit': item.primaryQuantity.unitOfMeasure,
        'Document': item.contentView.id
      };

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

      //adjust by Classification System 1
      if (itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne] == null){
        itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne] = {
          'byTakeoffType': {},
          'count': 0,
          'quantity': 0,
          'unitOfMeasure': item.primaryQuantity.unitOfMeasure,
          'classificationCodeOne': item.primaryQuantity.classificationCodeOne,
          'contentView': item.contentView.id
        }
      };
      if (itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne].contentView != item.contentView.id){
        itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne].contentView = '';
      }
      itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne].count += 1;
      itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne].quantity += item.primaryQuantity.quantity;
      if (itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne].byTakeoffType[item.takeoffTypeId] == null){
        itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne].byTakeoffType[item.takeoffTypeId] = this.getItemObject(item);
      }
      itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne].byTakeoffType[item.takeoffTypeId].count += 1;
      itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne].byTakeoffType[item.takeoffTypeId].quantity += item.primaryQuantity.quantity;
      if (itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne].byTakeoffType[item.takeoffTypeId].contentView != item.contentView.id){
        itemsObject.byClassificationSystem1[item.primaryQuantity.classificationCodeOne].byTakeoffType[item.takeoffTypeId].contentView = '';
      }

      //adjust by Classification System 2
      for(const secondaryQuantity of item.secondaryQuantities){
        if (itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo] == null){
          itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo] = {
            'byTakeoffType': {},
            'count': 0,
            'quantity': 0,
            'unitOfMeasure': secondaryQuantity.unitOfMeasure,
            'classificationCodeTwo': secondaryQuantity.classificationCodeTwo,
            'classificationCodeOne': item.primaryQuantity.classificationCodeOne,
            'contentView': item.contentView.id
          }
        };
        if (itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo].contentView != item.contentView.id){
          itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo].contentView = '';
        }
        itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo].count += 1;
        itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo].quantity += secondaryQuantity.quantity;
        if (itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo].byTakeoffType[item.takeoffTypeId] == null){
          itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo].byTakeoffType[item.takeoffTypeId] = this.getItemObject(item);
        }
        itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo].byTakeoffType[item.takeoffTypeId].count += 1;
        itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo].byTakeoffType[item.takeoffTypeId].quantity += secondaryQuantity.quantity;
        if (itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo].byTakeoffType[item.takeoffTypeId].contentView != item.contentView.id){
          itemsObject.byClassificationSystem2[secondaryQuantity.classificationCodeTwo].byTakeoffType[item.takeoffTypeId].contentView = '';
        }
      }
    }

    return itemsObject;
  }

  getItemObject(item){
    return {
      'count': 0,
      'quantity': 0,
      'unitOfMeasure': item.primaryQuantity.unitOfMeasure,
      'classificationCode': item.primaryQuantity.classificationCodeOne,
      'contentView': item.contentView.id
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
        let orderBy = $('input[name="group_by"]:checked').val();
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
        }

        await this.adjustRawItemsData();

        this.csvData = this.prepareCSVData();
        
      }
      catch(err){
        console.log(err);
      }
      
    }
  };

  async adjustRawItemsData(){
    let rawItemsArray = [];

    for(const itemId of Object.keys(this.items.rawItems)){
      // here we replace the document id by it's name
      this.items.rawItems[itemId].Document = this.views[this.items.rawItems[itemId].Document].name;
      rawItemsArray.push(
        this.items.rawItems[itemId]
      )
    }
    this.rawItemsDataset = rawItemsArray;
  }

  async adjustClassificationSystem2Data(){
    let byClassificationSystem2Array = [];

    for(const classificationCodeTwo of Object.keys(this.items.byClassificationSystem2)){
      let currentItem = this.items.byClassificationSystem2[classificationCodeTwo];
      let fullClassification2 = await this.getFullClassificationMap(classificationCodeTwo, Systems.System2);
      let classification1 = await this.getProperClassification(currentItem.classificationCodeOne);
      let insertIndex = 0;
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
            'document': currentItem.contentView
          }
          if(this.humanReadableData){
            // here we override its values in case human readable is recquired
            newItem.name += ` - ${classification2.description}`;
            newItem.quantity = newItem.quantity.toFixed(2);
            newItem.classification +=  ` - ${classification1.firstCode.description}`;
            newItem.document = (Guid_Pattern.test(newItem.document) ? this.views[newItem.document].name : newItem.document = '');
          }
          byClassificationSystem2Array.push(newItem);
          insertIndex = byClassificationSystem2Array.length;
        }
      }
      let system2ByTakeoffType = currentItem.byTakeoffType;
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
          'document': currenType.contentView
        }
        if(this.humanReadableData){
          // here we override its values in case human readable is recquired
          newItem.name = this.types[takeoffTypeId].name,
          newItem.quantity = newItem.quantity.toFixed(2);
          newItem.classification +=  ` - ${byTakeoffClassification.firstCode.description}`;
          newItem.document = (Guid_Pattern.test(newItem.document) ? this.views[newItem.document].name : newItem.document = '');
        }
        // here we add the new item based on its classification
        byClassificationSystem2Array.splice(insertIndex, 0, newItem);
      }
    }

    this.dataSet = byClassificationSystem2Array;
  }

  async adjustClassificationSystem1Data(){
    let byClassificationSystem1Array = [];

    for(const classificationCodeOne of Object.keys(this.items.byClassificationSystem1)){
      let currentItem = this.items.byClassificationSystem1[classificationCodeOne];
      let fullClassification1 = await this.getFullClassificationMap(classificationCodeOne);
      let lastClassification1 = fullClassification1[fullClassification1.length - 1];
      let insertIndex = 0;
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
            'document': currentItem.contentView
          }
          if(this.humanReadableData){
            // here we override its values in case human readable is recquired
            newItem.name += ` - ${classification1.description}`;
            newItem.quantity = newItem.quantity.toFixed(2);
            newItem.classification +=  ` - ${lastClassification1.description}`;
            newItem.document = (Guid_Pattern.test(newItem.document) ? this.views[newItem.document].name : newItem.document = '');
          }
          byClassificationSystem1Array.push(newItem);
          insertIndex = byClassificationSystem1Array.length;
        }
      }
      let system1ByTakeoffType = currentItem.byTakeoffType;
      for(const takeoffTypeId of Object.keys(system1ByTakeoffType)){
        let currenType = system1ByTakeoffType[takeoffTypeId];
        // Here we prepare each new item to the table
        let newItem = {
          'name': takeoffTypeId,
          'count': currenType.count,
          'quantity': currenType.quantity,
          'unit': currenType.unitOfMeasure,
          'classification': lastClassification1.code,
          'document': currenType.contentView
        }
        if(this.humanReadableData){
          // here we override its values in case human readable is recquired
          newItem.name = this.types[takeoffTypeId].name,
          newItem.quantity = newItem.quantity.toFixed(2);
          newItem.classification +=  ` - ${lastClassification1.description}`;
          newItem.document = (Guid_Pattern.test(newItem.document) ? this.views[newItem.document].name : newItem.document = '');
        }
        // here we add the new item based on its classification
        byClassificationSystem1Array.splice(insertIndex, 0, newItem);
      }
    }

    this.dataSet = byClassificationSystem1Array;
  }

  async adjustDocumentData(){
    let byDocumentArray = [];

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

    for(const takeoffTypeId of Object.keys(this.items.byTakeoffTypeId)){
      
      let currentItem = this.items.byTakeoffTypeId[takeoffTypeId];
      if (this.humanReadableData){
        let codeObject = this.getProperClassification(currentItem.classificationCode);
        byTakeofftypeArray.push({
          'name': this.types[takeoffTypeId].name,
          'count': currentItem.count,
          'quantity': currentItem.quantity.toFixed(2),
          'unit': currentItem.unitOfMeasure,
          'classification': `${codeObject.firstCode.code} - ${codeObject.firstCode.description}`,
          'document': (Guid_Pattern.test(currentItem.contentView) ? this.views[currentItem.contentView].name : '')
        })
      }
      else{
        byTakeofftypeArray.push({
          'name': takeoffTypeId,
          'count': currentItem.count,
          'quantity': currentItem.quantity,
          'unit': currentItem.unitOfMeasure,
          'classification': currentItem.classificationCode,
          'document': currentItem.contentView
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
        this.tableId = '#packageTable';
        break;
      }
      case TakeoffDataType.ITEMS: {
        this.tableId = '#itemsTable';
        break;
      }
    }
  };

  // current table id
  set CurrentTableId(newTableId) {
    this.tableId = newTableId;
  };

  addPackagesToPage(){
    $('#packages').empty();
    for(const newPackage of this.packages.sort((a,b) => (a.name > b.name ? 1 : -1))){
      $('#packages').append(
        `<div class="input-group" ><input type='radio'  name='packagesRadio' value='${newPackage.name}' checked><label style='' white-space: nowrap;'>&#160;${newPackage.name}</label></div><br>`
      );
    }
  }

  // draw the takeoff table based on the current data
  drawTakeoffTable() {

    let dataset = [];
    let rawItemsDataset = [];

    switch(this.currentDataType){
      case TakeoffDataType.PACKAGES: {
        this.addPackagesToPage()
        break;
      }
      case TakeoffDataType.ITEMS: {
        dataset = this.dataSet;
        rawItemsDataset = this.rawItemsDataset;
        break;
      }
    }

    let columns = this.getColumns(dataset);
    let rawColumns = this.getRawItemsColumns(rawItemsDataset);

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

    let csvRows = [];
    let csvHeader = (exportOption === 'exportall' ? ['Package Name' ] : []);

    // Set the header of CSV
    for (var key in this.dataSet[0]) {
      csvHeader.push(key);
    }
    csvRows.push(csvHeader);

    // Set the row data of CSV
    this.dataSet.forEach((item) => {
      let csvRowTmp = (exportOption === 'exportall' ? [this.packageName] : []);
      for (key in item) {
        csvRowTmp.push( item[key] );
      }
      csvRows.push(csvRowTmp);
    })
    return csvRows;
  };

  async refreshTable() {

    this.IsHumanReadable = isHumanReadable();

    let groupBy = $('input[name="group_by"]:checked').val();
    switch (groupBy) {
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
    csvData = (temporaryTable.csvData.length > 1 ? csvData.concat(temporaryTable.csvData) : csvData);
  }
  downloadAllCSV(csvData);
  $('#executeCSV').show();
  $('.importInProgress').hide();

}

function isHumanReadable(){
  return $('input[name="dataTypeToDisplay"]:checked').val() === 'humanReadable'
}

// Event while DOM tree is ready
$(document).ready(function () {

  $('#executeCSV').click(function () {
    // Export the current table
    if( !packageTable || !packageTable.csvData ){
      alert('Please get the data first.')
      return;
    }

    exportOption = $('input[name="export"]:checked').val();
    switch( exportOption ){
      case 'exportcurrent':{
        packageTable.exportCSV();
        break;
      };
      case 'exportall':{
        exportAllCSV(); 
        break;
      }
    }
    
  });


  $('#btnRefresh').click(async () => {
    const projectHref = $('#labelProjectHref').text();
    const projectId = $('#labelProjectId').text();
    if (projectHref === '' || projectId === '') {
      alert('please select one project!');
      return;
    }

    $('.clsInProgress').show();
    $('.clsResult').hide();

    packageTable.IsHumanReadable = isHumanReadable();
    packageTable.packageName = $('input[name="packagesRadio"]:checked').val();

    let dataFetchs;
    if(!packageTable.packageName){
      packageTable.CurrentDataType = TakeoffDataType.PACKAGES;
      dataFetchs = ['packages','systems', 'views'];
    }
    else{
      packageTable.updatePackageId();
      packageTable.CurrentDataType = TakeoffDataType.ITEMS;
      dataFetchs = ['items','types'];
    }

    try{
      for(const data of dataFetchs){
        await packageTable.fetchDataAsync(data);
      }
      await packageTable.polishDataOfCurrentDataTypeAsync();
      packageTable.drawTakeoffTable();  
    }catch(err){
      console.log(err);
    }

    $('.clsInProgress').hide();
    $('.clsResult').show();
  })

});


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

