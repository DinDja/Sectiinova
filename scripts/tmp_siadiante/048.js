(function( factory ){
    if ( typeof define === 'function' && define.amd ) {
        // AMD
        define( ['jquery', 'datatables.net', 'datatables.net-buttons'], function ( $ ) {
            return factory( $, window, document );
        } );
    }
    else if ( typeof exports === 'object' ) {
        // CommonJS
        module.exports = function (root, $) {
            if ( ! root ) {
                root = window;
            }
 
            if ( ! $ || ! $.fn.dataTable ) {
                $ = require('datatables.net')(root, $).$;
            }
 
            if ( ! $.fn.dataTable.Buttons ) {
                require('datatables.net-buttons')(root, $);
            }
 
            return factory( $, root, root.document );
        };
    }
    else {
        // Browser
        factory( jQuery, window, document );
    }
}(function( $, window, document, undefined ) {
'use strict';
var DataTable = $.fn.dataTable;
 
 
var _link = document.createElement( 'a' );
 
/**
 * Convert a `link` tag's URL from a relative to an absolute address so it will
 * work correctly in the popup window which has no base URL.
 *
 * @param  {node}     el Element to convert
 */
var _relToAbs = function( el ) {
    var url;
    var clone = $(el).clone()[0];
    var linkHost;
 
    if ( clone.nodeName.toLowerCase() === 'link' ) {
        _link.href = clone.href;
        linkHost = _link.host;
 
        // IE doesn't have a trailing slash on the host
        // Chrome has it on the pathname
        if ( linkHost.indexOf('/') === -1 && _link.pathname.indexOf('/') !== 0) {
            linkHost += '/';
        }
 
        clone.href = _link.protocol+"//"+linkHost+_link.pathname+_link.search;
    }
 
    return clone.outerHTML;
};
 
 
DataTable.ext.buttons.print = {
    className: 'buttons-print',
 
    text: function ( dt ) {
        return dt.i18n( 'buttons.print', 'Print' );
    },
 
    action: function ( e, dt, button, config ) {
        var data = dt.buttons.exportData( config.exportOptions );
        var addRow = function ( d, tag ) {
            var str = '<tr>';
 
            for ( var i=0, ien=d.length ; i<ien ; i++ ) {
                str += '<'+tag+'>'+d[i]+'</'+tag+'>';
            }
 
            return str + '</tr>';
        };
 
        // Construct a table for printing
        var html = '<table class="'+dt.table().node().className+'">';
 
        if ( config.header ) {
            html += '<thead>'+ addRow( data.header, 'th' ) +'</thead>';
        }
 
        html += '<tbody>';
        for ( var i=0, ien=data.body.length ; i<ien ; i++ ) {
            html += addRow( data.body[i], 'td' );
        }
        html += '</tbody>';
 
        if ( config.footer && data.footer ) {
            html += '<tfoot>'+ addRow( data.footer, 'th' ) +'</tfoot>';
        }
 
        var frame1 = $("<iframe />");
        frame1[0].name = "frame1";
        frame1.css({ "position": "absolute", "top": "-1000000px" });
        $("body").append(frame1);
        var frameDoc = frame1[0].contentWindow ? frame1[0].contentWindow : frame1[0].contentDocument.document ? frame1[0].contentDocument.document : frame1[0].contentDocument;
 
        // Open a new window for the printable table
        var title = config.title;
 
        if ( typeof title === 'function' ) {
            title = title();
        }
 
        if ( title.indexOf( '*' ) !== -1 ) {
            title= title.replace( '*', $('title').text() );
        }
 
        // Inject the title and also a copy of the style and link tags from this
        // document so the table can retain its base styling. Note that we have
        // to use string manipulation as IE won't allow elements to be created
        // in the host document and then appended to the new window.
        var head = '<title>'+title+'</title>';
        $('style, link').each( function () {
            head += _relToAbs( this );
        } );
 
        try {
            frameDoc.document.head.innerHTML = head; // Work around for Edge
        }
        catch (e) {
            $(frameDoc.document.head).html(head); // Old IE
        }
 
        // Inject the table and other surrounding information
        frameDoc.document.body.innerHTML =
            '<h1>'+title+'</h1>'+
            '<div>'+
                (typeof config.message === 'function' ?
                    config.message( dt, button, config ) :
                    config.message
                )+
            '</div>'+
            html;
 
             if ( config.customize ) {
                 config.customize(frameDoc);
             }

             if (navigator.userAgent.indexOf("Firefox") !== -1) {
                 var printWindow = window.open("", "_blank");
                 printWindow.document.write('<style>@media print { .no-print, .no-print * { display: none !important; }; .box-bt{ display:none; } }</style>');
                 printWindow.document.write('<div class="box-bt" style="text-align: center;padding: 30px;background: #fff;"><input type="button" id="btnPrint" value="Imprimir" class="no-print"  onclick="window.print()" style="box-shadow: 0 2px 5px rgba(0, 0, 0, 0.16), 0 2px 10px rgba(0, 0, 0, 0.12);-webkit-border-radius: 2px;-moz-border-radius: 2px;-ms-border-radius: 2px;border-radius: 2px;border: none;border-bottom-width: medium;border-bottom-style: none;border-bottom-color: currentcolor;font-size: 13px;outline: none;padding: 8px 20px;margin-right: 8px;background-color: #4CAF50 !important;color: #ffff;" />');
                 printWindow.document.write('<input type="button" id="btnCancel" value="Cancel" class="no-print"  onclick="window.close()" style="box-shadow: 0 2px 5px rgba(0, 0, 0, 0.16), 0 2px 10px rgba(0, 0, 0, 0.12);-webkit-border-radius: 2px;-moz-border-radius: 2px;-ms-border-radius: 2px;border-radius: 2px;border: none;border-bottom-width: medium;border-bottom-style: none;border-bottom-color: currentcolor;font-size: 13px;outline: none;padding: 8px 20px;margin-right: 8px;background-color: #D52424 !important;color: #ffff;"/> </div>');
                 printWindow.document.write(head);
                 printWindow.document.write('<h1>' + title + '</h1>');
                 printWindow.document.write('<div>');
                 (typeof config.message === 'function'
                         ? printWindow.document.write(config.message(dt, button, config))
                         : printWindow.document.write(config.message));
                 printWindow.document.write('</div>');
                 printWindow.document.write(html);
                 printWindow.document.close();
                 printWindow.focus();
                 printWindow = null;
                 window.print();
             } else {
                 setTimeout(function () {
                     window.frames["frame1"].focus();
                     window.frames["frame1"].print();
                     frame1.remove();
                     frameDoc = null;
                     frame1 = null;
                 }, 250);
             }
         },
 
    title: '*',
 
    message: '',
 
    exportOptions: {},
 
    header: true,
 
    footer: false,
 
    autoPrint: true,
 
    customize: null
};
 
return DataTable.Buttons;
}));