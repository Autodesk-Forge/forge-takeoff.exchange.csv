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

  $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
    $('#btnRefresh').click();
    manageImportExportOptions();
  });

  $.getJSON("/api/forge/oauth/clientid", function (res) {
    $("#ClientID").val(res.id);
    $("#provisionAccountSave").click(function () {
      $('#provisionAccountModal').modal('toggle');
      $('#sourceHubs').jstree(true).refresh();
    });
  });  

});

//Here we manage available options based on selected data (ITEM or CLASSIFICATIONS)
function manageImportExportOptions(){
  const activeTab = $("ul#takeoffTableTabs li.active").children()[0].hash;
    switch(activeTab){
      case '#items':
        disableOptions('import');
        break;
      case '#classificationsystems':
        disableOptions('export');
        break;
    }
}

const ExportImportOptions = {
  EXPORTCURRENTTABLE: 'exportcurrent',
  EXPORTALLITEMS: 'exportall',
  UPDATECLASSIFICATIONS: 'updateclassifications',
  CREATECLASSIFICATION: 'createclassification'
} 

const ImportExportRadioName = 'exportimport';

//Here we disable and enable the options based on selected data (ITEM or CLASSIFICATIONS)
function disableOptions(optionsToDisable){
  switch(optionsToDisable){
    case 'export':
      $(`input[name="${ImportExportRadioName}"][value="${ExportImportOptions.EXPORTCURRENTTABLE}"]`).attr("disabled",false);
      $(`input[name="${ImportExportRadioName}"][value="${ExportImportOptions.EXPORTALLITEMS}"]`).attr("disabled",true);
      $(`input[name="${ImportExportRadioName}"][value="${ExportImportOptions.UPDATECLASSIFICATIONS}"]`).attr("disabled",false);
      $(`input[name="${ImportExportRadioName}"][value="${ExportImportOptions.CREATECLASSIFICATION}"]`).attr("disabled",false);
      break;
    case 'import':
      $(`input[name="${ImportExportRadioName}"][value="${ExportImportOptions.EXPORTCURRENTTABLE}"]`).attr("disabled",false);
      $(`input[name="${ImportExportRadioName}"][value="${ExportImportOptions.EXPORTALLITEMS}"]`).attr("disabled",false);
      $(`input[name="${ImportExportRadioName}"][value="${ExportImportOptions.UPDATECLASSIFICATIONS}"]`).attr("disabled",true);
      $(`input[name="${ImportExportRadioName}"][value="${ExportImportOptions.CREATECLASSIFICATION}"]`).attr("disabled",true);
      break;
  }
  
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
  }).on('select_node.jstree', function(evt, data){
    if (data != null && data.node != null && (data.node.type == 'accprojects' )) {
      $('#labelProjectHref').text(data.node.id);
      $('#labelProjectId').text(data.node.original.project_id);
      // create the takeoff table when project is selected.
      if( packageTable != null ){
        delete packageTable;
        packageTable = null;
      }

      $('#list').empty();

      packageTable = new PackageTable('#mainTable', '#secondaryTable', data.node.original.project_id, data.node.id, TakeoffDataType.PACKAGES);
      $('#packages').empty();
      $('#btnRefresh').click();
      manageImportExportOptions();
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