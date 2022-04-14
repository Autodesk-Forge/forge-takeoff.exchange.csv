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

$(document).ready(function () {
  // first, check if current visitor is signed in
  jQuery.ajax({
    url: '/api/forge/oauth/token',
    success: function (res) {
      // yes, it is signed in...
      $('#autodeskSignOutButton').show();
      $('#autodeskSigninButton').hide();

      $('#refreshSourceHubs').show();
      
      // prepare sign out
      $('#autodeskSignOutButton').click(function () {
        $('#hiddenFrame').on('load', function (event) {
          location.href = '/api/forge/oauth/signout';
        });
        $('#hiddenFrame').attr('src', 'https://accounts.autodesk.com/Authentication/LogOut');
        // learn more about this signout iframe at
        // https://forge.autodesk.com/blog/log-out-forge
      })

      // and refresh button
      $('#refreshSourceHubs').click(function () {
        $('#sourceHubs').jstree(true).refresh();
      });

      prepareUserHubsTree();
      showUser();
    },
    error: function(err){
      $('#autodeskSignOutButton').hide();
      $('#autodeskSigninButton').show();
    }
  });

  $('#autodeskSigninButton').click(function () {
    jQuery.ajax({
      url: '/api/forge/oauth/url',
      success: function (url) {
        location.href = url;
      }
    });
  });

  $('#group_by').change(function() {
    if(!!packageTable){
      packageTable.refreshTable();
    }
  });

  $('input[type=radio][name=dataTypeToDisplay]').change(function() {
    if(!!packageTable){
      packageTable.refreshTable();
    }
  });

  $('input[type=radio][name=measurementSystem]').change(async function(event) {
    if(!!packageTable){
      let patchSettingsResponse = await packageTable.patchSettings(event.target.value);
      if(patchSettingsResponse.statusCode !== 200 ){
        Swal.fire({
          icon: 'error',
          title: 'An error occurred',
          text: 'Unable to change this Measurement System!'
        })
      }
    }
  });

  $('a[data-toggle="tab"]').on('shown.bs.tab', async function (event) {
    await toggleTab(event.target.hash);
  });

  $.getJSON("/api/forge/oauth/clientid", function (res) {
    $("#ClientID").val(res.id);
    $("#provisionAccountSave").click(function () {
      $('#provisionAccountModal').modal('toggle');
      $('#sourceHubs').jstree(true).refresh();
    });
  });  
});

async function toggleTab(selectedTab){
  const projectHref = $('#labelProjectHref').text();
  const projectId = $('#labelProjectId').text();
  if (projectHref === '' || projectId === '') {
    alert('please select one project!');
    return;
  }

  $('#list').empty();

  let dataFetchs;
  packageTable.IsHumanReadable = isHumanReadable();
  //Here we grab the package/classification name
  packageTable.packageName = selectedTab;
  switch(selectedTab){
    case '#items':{
      $(`#${CaseDependentRows.PackagesGroupBy}`).show();
      $(`#${CaseDependentRows.MeasurementSystems}`).hide();

      dataFetchs = ['packages','systems', 'views', 'locations'];
      packageTable.CurrentDataType = TakeoffDataType.PACKAGES;
      
      $(`#${Titles.ListTitle}`).html('PACKAGES');
      $('#addPackage').show();
      $(`#${TablesIds.MainTable}`).show();
      $(`#${TablesIds.SecondaryTable}`).show();
      $(`#${Titles.TablesTitle}`).html(`INVENTORY - ${packageTable.packageName || 'Choose a project'}`);
      $(`#${Titles.MainTableTitle}`).html('Grouped Items');
      $(`#${Titles.SecondaryTableTitle}`).html('List of All Items');
        break;
    }
    case '#classificationsystems':{
      $(`#${CaseDependentRows.PackagesGroupBy}`).hide();
      $(`#${CaseDependentRows.MeasurementSystems}`).show();
      packageTable.CurrentDataType = TakeoffDataType.SYSTEMS;
      
      dataFetchs = ['packages', 'systems', 'views'];
      $(`#${Titles.ListTitle}`).html('CLASSIFICATION SYSTEMS');
      $('#addPackage').hide();
      $(`#${TablesIds.SecondaryTable}`).hide();
      $(`#${Titles.TablesTitle}`).html('CLASSIFICATIONS');
      $(`#${Titles.MainTableTitle}`).html('');
      $(`#${Titles.SecondaryTableTitle}`).html('');
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
  // packageTable.checkMeasurementSystem();

  await handleListChange();

  manageImportExportOptions();
    
  updateTitles();

  $('.clsInProgress').hide();
  $('.clsResult').show();
}

const ImportOptions = {
  UpdateClassifications: 'updateclassifications',
  CreateClassification: 'createclassification'
}

const ExportRadioNames = {
  ExportTable: 'exporttable',
  ExportPackage: 'exportpackage'
}

const ExportRadioValues = {
  CurrentPackage: 'exportcurrentpackage',
  AllPackages: 'exportallpackages',
  MainTable: 'exportmaintable',
  SecondaryTable: 'exportsecondarytable'
}

const ExportButtons = {
  ExportPackage: 'exportCSV',
  ExportClassification: 'exportClassification'
}

const ExportOptions = {
  ExportCurrentMainTable: 'exportcurrentpackage-exportmaintable',
  ExportCurrentSecondaryTable: 'exportcurrentpackage-exportsecondarytable',
  ExportAllMainTable: 'exportallpackages-exportmaintable',
  ExportAllSecondaryTable: 'exportallpackages-exportsecondarytable'
}


function updateTitles(){
  const activeTab = $("ul#takeoffTableTabs li.active").children()[0].hash;
    switch( activeTab ){
      case '#items':{
        $(`#${Titles.TablesTitle}`).html(`INVENTORY - ${$('input[name="listRadio"]:checked').val() || 'Choose a project'}`);
        break;
      }
      case '#classificationsystems':{
        $(`#${Titles.TablesTitle}`).html('CLASSIFICATIONS');
        break;
      }
    }
}

//Here we manage available options based on selected data (ITEM or CLASSIFICATIONS)
function manageImportExportOptions(){
  const activeTab = $("ul#takeoffTableTabs li.active").children()[0].hash;
  let optionsToHide = [];
  let optionsToShow = [];
  let buttonsToHide = [];
  let buttonsToShow = [];
  switch(activeTab){
    case '#items':
      $('#exporttablelabel').show();
      $('#exportpackagelabel').show();
      $('input[name="dataTypeToDisplay"]').parent().parent().parent().show();
      optionsToHide.push(...[]);
      optionsToShow.push(...[
        {
          optionName: ExportRadioNames.ExportPackage, 
          optionValue: ExportRadioValues.AllPackages
        },
        {
          optionName: ExportRadioNames.ExportPackage, 
          optionValue: ExportRadioValues.CurrentPackage
        }, 
        {
          optionName: ExportRadioNames.ExportTable, 
          optionValue: ExportRadioValues.MainTable
        }, 
        {
          optionName: ExportRadioNames.ExportTable, 
          optionValue: ExportRadioValues.SecondaryTable
        }
      ]);
      buttonsToHide.push(...[
        ImportOptions.CreateClassification, 
        ImportOptions.UpdateClassifications,
        ExportButtons.ExportClassification
      ]);
      buttonsToShow.push(...[
        ExportButtons.ExportPackage
      ]);
      break;
    case '#classificationsystems':
      $('#exporttablelabel').hide();
      $('#exportpackagelabel').hide();
      $('input[name="dataTypeToDisplay"]').parent().parent().parent().hide();
      optionsToHide.push(...[
        {
          optionName: ExportRadioNames.ExportPackage, 
          optionValue: ExportRadioValues.AllPackages
        },
        {
          optionName: ExportRadioNames.ExportPackage, 
          optionValue: ExportRadioValues.CurrentPackage
        }, 
        {
          optionName: ExportRadioNames.ExportTable, 
          optionValue: ExportRadioValues.MainTable
        }, 
        {
          optionName: ExportRadioNames.ExportTable, 
          optionValue: ExportRadioValues.SecondaryTable
        }
      ]);
      optionsToShow.push(...[]);
      buttonsToHide.push(...[
        ExportButtons.ExportPackage
      ]);
      buttonsToShow.push(...[
        ImportOptions.CreateClassification, 
        ImportOptions.UpdateClassifications,
        ExportButtons.ExportClassification
      ]);
      break;
  }
  hideNShowOptions(optionsToHide, optionsToShow, buttonsToHide, buttonsToShow);
}

const ImportExportRadioName = 'exportimport';

function hideNShowOptions(optionsToHide, optionsToShow, buttonsToHide, buttonsToShow){
  for(const optionToHide of optionsToHide){
    $(`input[name="${optionToHide.optionName}"][value="${optionToHide.optionValue}"]`).parent().parent().hide();
  }
  for(const optionToShow of optionsToShow){
    $(`input[name="${optionToShow.optionName}"][value="${optionToShow.optionValue}"]`).parent().parent().show();
  }
  for(const buttonToHide of buttonsToHide){
    $(`#${buttonToHide}`).hide();
  }
  for(const buttonToShow of buttonsToShow){
    $(`#${buttonToShow}`).show();
  }

  $(`#${ImportOptions.CreateClassification}`).prop("disabled", false);
  $(`#${ImportOptions.UpdateClassifications}`).prop("disabled", false);

  $(`#${ButtonsLabelsIds.ImportClassification}`).html('').hide();
  //Here we handle the case where we already have 2 classification systems, so creation isn't possible
  if(Object.keys(packageTable.systems).length == 2){
    $(`#${ImportOptions.CreateClassification}`).prop("disabled", true);
    if(!$(`#${ImportOptions.CreateClassification}`).is(":hidden"))
      $(`#${ButtonsLabelsIds.ImportClassification}`).html('The project already has 2 classifications!').show();
  }

  $(`#${ButtonsLabelsIds.UpdateClassification}`).html('').hide();
  //Here we handle the case where there's no classification at all, so there's nothing to update
  if(Object.keys(packageTable.systems).length == 0 || !packageTable.canUpdateClassifications){
    $(`#${ImportOptions.UpdateClassifications}`).prop("disabled", true);
    if(!$(`#${ImportOptions.UpdateClassifications}`).is(":hidden"))
      $(`#${ButtonsLabelsIds.UpdateClassification}`).html('There\'s no classification to update!').show();
  }

  $(`input[name="${ExportRadioNames.ExportPackage}"]:visible`).prop("checked", true);
  $(`input[name="${ExportRadioNames.ExportTable}"]:visible`).prop("checked", true);

}

function anyExportVisible(){
  for(const exportOption of Object.keys(ExportOptions)){
    if($(`input[name="${ImportExportRadioName}"][value="${ExportOptions[exportOption]}"]`).is(':visible'))
      return true;
  }
  return false;
}

function anyImportVisible(){
  for(const importOption of Object.keys(ImportOptions)){
    if($(`input[name="${ImportExportRadioName}"][value="${ImportOptions[importOption]}"]`).is(':visible'))
      return true;
  }
  return false;
}

async function handleListChange(){
  // $('#btnRefresh').click();

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
      $(`#${CaseDependentRows.PackagesGroupBy}`).show();
      $(`#${CaseDependentRows.MeasurementSystems}`).hide();
      
      packageTable.updatePackageId();
      packageTable.CurrentDataType = TakeoffDataType.ITEMS;
      dataFetchs = ['types', 'items'];

      $(`#${Titles.ListTitle}`).html('PACKAGES');
      $('#addPackage').show();
      $(`#${TablesIds.MainTable}`).show();
      $(`#${TablesIds.SecondaryTable}`).show();
      $(`#${Titles.TablesTitle}`).html(`INVENTORY - ${packageTable.packageName || 'Choose a project'}`);
      $(`#${Titles.MainTableTitle}`).html('Grouped Items');
      $(`#${Titles.SecondaryTableTitle}`).html('List of All Items');
      break;
    }
    case '#classificationsystems':{
      $(`#${CaseDependentRows.PackagesGroupBy}`).hide();
      $(`#${CaseDependentRows.MeasurementSystems}`).show();
      
      packageTable.CurrentDataType = TakeoffDataType.CLASSIFICATIONS;

      dataFetchs = ['packages', 'systems', 'views'];
      $(`#${Titles.ListTitle}`).html('CLASSIFICATION SYSTEMS');
      $('#addPackage').hide();
      $(`#${TablesIds.SecondaryTable}`).hide();
      $(`#${Titles.TablesTitle}`).html('CLASSIFICATIONS');
      $(`#${Titles.MainTableTitle}`).html('');
      $(`#${Titles.SecondaryTableTitle}`).html('');
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

  manageImportExportOptions();
    
  updateTitles();

  $('.clsInProgress').hide();
  $('.clsResult').show();

}

function prepareUserHubsTree() {
  $('#sourceHubs').jstree({
      'core': {
          'themes': { "icons": true },
          'multiple': false,
          'data': {
              "url": '/api/forge/datamanagement',
              "dataType": "json",
              'cache': false,
              'data': function (node) {
                  $('#sourceHubs').jstree(true).toggle_node(node);
                  return { "id": node.id };
              }
          }
      },
      'types': {
          'default': { 'icon': 'glyphicon glyphicon-question-sign' },
          '#': { 'icon': 'glyphicon glyphicon-user' },
          'bim360Hubs': { 'icon': './img/bim360hub.png' },
          'bim360projects': { 'icon': './img/bim360project.png' },
          'accprojects': { 'icon': './img/accproject.svg'},
          'unsupported': { 'icon': 'glyphicon glyphicon-ban-circle' }
      },
      "sort": function (a, b) {
          var a1 = this.get_node(a);
          var b1 = this.get_node(b);
          var parent = this.get_node(a1.parent);
          if (parent.type === 'items') { // sort by version number
              var id1 = Number.parseInt(a1.text.substring(a1.text.indexOf('v') + 1, a1.text.indexOf(':')))
              var id2 = Number.parseInt(b1.text.substring(b1.text.indexOf('v') + 1, b1.text.indexOf(':')));
              return id1 > id2 ? 1 : -1;
          }
          else if (a1.type !== b1.type) return a1.icon < b1.icon ? 1 : -1; // types are different inside folder, so sort by icon (files/folders)
          else return a1.text > b1.text ? 1 : -1; // basic name/text sort
      },
      "plugins": ["types", "state", "sort"],
      "state": { "key": "sourceHubs" }// key restore tree state
  }).on('select_node.jstree', async function(evt, data){
    if (data != null && data.node != null && (data.node.type == 'accprojects' )) {
      $('#labelProjectHref').text(data.node.id);
      $('#labelProjectId').text(data.node.original.project_id);
      // create the takeoff table when project is selected.
      if( packageTable != null ){
        delete packageTable;
        packageTable = null;
      }

      packageTable = new PackageTable('#mainTable', '#secondaryTable', data.node.original.project_id, data.node.id, TakeoffDataType.PACKAGES);
      // $('#btnRefresh').click();

      let selectedTab = $("ul#takeoffTableTabs li.active").children()[0].hash;
      await toggleTab(selectedTab);
      await packageTable.checkMeasurementSystem();
      await packageTable.checkClassificationsUpdate();
    }
    if (data != null && data.node != null && (data.node.type == 'bim360projects' )) {
      alert("Only ACC project is supported, please select ACC project!")
    }

  }); 
}

function showUser() {
  jQuery.ajax({
    url: '/api/forge/user/profile',
    success: function (profile) {
      var img = '<img src="' + profile.picture + '" height="20px">';
      $('#userInfo').html(img + profile.name);
    }
  });
}