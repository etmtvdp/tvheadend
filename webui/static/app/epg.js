
tvheadend.epgDetails = function(event) {


    var content = '';
    
    if(event.chicon != null && event.chicon.length > 0)
	content += '<img class="x-epg-chicon" src="' + event.chicon + '">';

    content += '<div class="x-epg-title">' + event.title + '</div>';
    content += '<div class="x-epg-desc">' + event.description + '</div>';

    content += '<div class="x-epg-meta">' + event.contentgrp + '</div>';

    var win = new Ext.Window({
	title: event.title,
	bodyStyle: 'margin: 5px',
        layout: 'fit',
        width: 400,
        height: 300,
	constrainHeader: true,
	buttons: [
	    new Ext.Button({
		handler: recordEvent,
		text: "Record program"
	    })
	],
	buttonAlign: 'center',
	html: content,
    });
    win.show();


    function recordEvent() {
	Ext.Ajax.request({
	    url: '/dvr',
	    params: {eventId: event.id, op: 'recordEvent'},

	    success:function(response, options) {
		win.close();
	    },

	    failure:function(response, options) {
		Ext.MessageBox.alert('DVR', response.statusText);
	    }
	});
    }

}


/**
 *
 */

tvheadend.epg = function() {
    var xg = Ext.grid;

    var epgRecord = Ext.data.Record.create([
	{name: 'id'},
	{name: 'channel'},
	{name: 'title'},
	{name: 'description'},
	{name: 'chicon'},
        {name: 'start', type: 'date', dateFormat: 'U' /* unix time */},
        {name: 'end', type: 'date', dateFormat: 'U' /* unix time */},
        {name: 'duration'},
	{name: 'contentgrp'}
    ]);
		    
    var epgStore = new Ext.data.JsonStore({
	root: 'entries',
        totalProperty: 'totalCount',
	fields: epgRecord,
	url: 'epg',
	autoLoad: true,
	id: 'id',
	remoteSort: true,
    });

    function renderDate(value){
	var dt = new Date(value);
	return dt.format('l H:i');
    } 

   function renderDuration(value){
       value = value / 60; /* Nevermind the seconds */
       
       if(value >= 60) {
	   var min = value % 60;
	   var hours = parseInt(value / 60);

	   if(min == 0) {
	       return hours + ' hrs';
	   }
	   return hours + ' hrs, ' + min + ' min';
       } else {
	   return value + ' min';
       }
    } 

    var epgCm = new Ext.grid.ColumnModel([
	{
	    width: 250,
	    id:'title',
	    header: "Title",
	    dataIndex: 'title',
	},{
	    width: 100,
	    id:'start',
	    header: "Start",
	    dataIndex: 'start',
	    renderer: renderDate,
	},{
	    width: 100,
	    hidden:true,
	    id:'end',
	    header: "End",
	    dataIndex: 'end',
	    renderer: renderDate,
	},{
	    width: 100,
	    id:'duration',
	    header: "Duration",
	    dataIndex: 'duration',
	    renderer: renderDuration
	},{
	    width: 250,
	    id:'channel',
	    header: "Channel",
	    dataIndex: 'channel',
	},{
	    width: 250,
	    id:'contentgrp',
	    header: "Content Type",
	    dataIndex: 'contentgrp',
	}
    ]);


    // Title search box

    var epgFilterTitle = new Ext.form.TextField({
	emptyText: 'Search title...',
	width: 200
    });


    // Channels, uses global store

    var epgFilterChannels = new Ext.form.ComboBox({
	loadingText: 'Loading...',
	width: 200,
	displayField:'name',
	store: tvheadend.channels,
	mode: 'local',
	editable: false,
	triggerAction: 'all',
	emptyText: 'Only include channel...'
    });

    // Tags, uses global store

    var epgFilterChannelTags = new Ext.form.ComboBox({
	width: 200,
	displayField:'name',
	store: tvheadend.channelTags,
	mode: 'local',
	editable: false,
	triggerAction: 'all',
	emptyText: 'Only include tag...'
    });

    // Content groups

    var epgFilterContentGroupStore = new Ext.data.JsonStore({
	root:'entries',
	fields: [{name: 'name'}],
	url:'ecglist',
    });


    var epgFilterContentGroup = new Ext.form.ComboBox({
	loadingText: 'Loading...',
	width: 200,
	displayField:'name',
	store: epgFilterContentGroupStore,
	mode: 'remote',
	editable: false,
	triggerAction: 'all',
	emptyText: 'Only include content...'
    });


    function epgQueryClear() {
	epgStore.baseParams.channel    = null;
	epgStore.baseParams.tag        = null;
	epgStore.baseParams.contentgrp = null;
	epgStore.baseParams.title      = null;

	epgFilterChannels.setValue("");
	epgFilterChannelTags.setValue("");
	epgFilterContentGroup.setValue("");
	epgFilterTitle.setValue("");

	epgStore.reload();
    }

    epgFilterChannels.on('select', function(c, r) {
	if(epgStore.baseParams.channel != r.data.name) {
	    epgStore.baseParams.channel = r.data.name;
	    epgStore.reload();
	}
    });

    epgFilterChannelTags.on('select', function(c, r) {
	if(epgStore.baseParams.tag != r.data.name) {
	    epgStore.baseParams.tag = r.data.name;
	    epgStore.reload();
	}
    });

    epgFilterContentGroup.on('select', function(c, r) {
	if(epgStore.baseParams.contentgrp != r.data.name) {
	    epgStore.baseParams.contentgrp = r.data.name;
	    epgStore.reload();
	}
    });

    epgFilterTitle.on('valid', function(c) {
	var value = c.getValue();

	if(value.length < 1)
	    value = null;

	if(epgStore.baseParams.title != value) {
	    epgStore.baseParams.title = value;
	    epgStore.reload();
	}
    });

    var panel = new Ext.grid.GridPanel({
        loadMask: true,
	stripeRows: true,
	disableSelection: true,
	title: 'Electronic Program Guide',
	store: epgStore,
	cm: epgCm,
        viewConfig: {forceFit:true},
	tbar: [
	    epgFilterTitle,
	    '-',
	    epgFilterChannels,
	    '-',
	    epgFilterChannelTags,
	    '-',
	    epgFilterContentGroup,
	    '-',
	    {
		text: 'Reset',
		handler: epgQueryClear
	    }
	],
	
        bbar: new Ext.PagingToolbar({
            store: epgStore,
            pageSize: 20,
            displayInfo: true,
            displayMsg: 'Programs {0} - {1} of {2}',
            emptyMsg: "No programs to display"
        })

    });
    
    panel.on('rowclick', rowclicked);


    function rowclicked(grid, index) {
	new tvheadend.epgDetails(grid.getStore().getAt(index).data);
    }


    return panel;
}
