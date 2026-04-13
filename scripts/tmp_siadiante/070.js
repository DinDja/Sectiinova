/*!
 * jQuery Sec Grid Plugin
 * version: 2.x.x
 * @requires jQuery v1.5 or later & bootstrap.css
 * Author: (c) 2019 Carlivan Silva Pereira, carlivanpereira@gmail.com 
 * http://www.casipe.com.br
 */
if (typeof jQuery === 'undefined') {
    throw new Error('secGrid requires jQuery');
}
(function ($) {
    var version = $.fn.jquery.split(' ')[0].split('.');
    if ((+version[0] < 2 && +version[1] < 9) || (+version[0] === 1 && +version[1] === 9 && +version[2] < 1)) {
        throw new Error('secGrid requires jQuery version 1.9.1 or higher');
    }
}(window.jQuery));

(function ($) {
    "use strict";

    $.fn.secGrid = function (options) {

        const version = '2.1.0';

        // Default options
        const settings = $.extend({
            selectorBtnAdd: '',
            selectorBtnEdit: '',
            isActionEdit: true, //true|false
            isActionRemove: true, //true|false
            nameDataValue: 'secgrid',
            isRenderMenu: true,
            before: function (e, callback) {
                if (typeof callback != "undefined" && callback != null) {
                    callback(e);
                }
            },
            success: function (res, e, callback) {
                if (typeof callback != "undefined" && callback != null) {
                    callback(res, e);
                }
            },
            actionEdit: function (datas, e, callback) {
                if (typeof callback != "undefined" && callback != null) {
                    callback(datas, e);
                }
            },
            actionAdd: function (datas, e, callback) {
                if (typeof callback != "undefined" && callback != null) {
                    callback(datas, e);
                }
            },
            actionRemove: function (datas, e, callback) {
                if (typeof callback != "undefined" && callback != null) {
                    callback(datas, e);
                }
            },
            error: function (callback) {
                if (typeof callback != "undefined" && callback != null) {
                    callback();
                }
            },
            renderMenuAction: function (callback) {
                if (typeof callback != "undefined" && callback != null) {
                    callback();
                }
            },
            actionCustom: function (elem, action, callback) {
                if (typeof callback != "undefined" && callback != null) {
                    callback(elem, action);
                }
            },
        }, options);

        const _this = $(this);
        let _objRow = null;
        let elemCellRemove = null;
        let _Datas = [];

        const callbackBefore = function () {
            return settings.before();
        };
        const callbackError = function (e) {
            return settings.error(e);
        };
        const callbackSuccess = function (res, e) {
            return settings.success(res, e);
        };
        const callbackAdd = function (datas, e) {
            return settings.actionAdd(datas, e);
        };
        const callbackEdit = function (datas, e) {
            return settings.actionEdit(datas, e);
        };
        const callbackRemove = function (datas, e) {
            return settings.actionRemove(datas, e);
        };
        const callbackActionCustom = function (datas, elem, action) {
            return settings.actionCustom(datas, elem, action);
        };
        const callbackRenderMenuAction = function (e, params) {
            return settings.renderMenuAction(e, params);
        };
        const validatorRemove = function (e) {
            return settings.validatorRemove(e);
        };

        const renderMenuAction = function (params) {

            let isActionEdit = settings.isActionEdit;
            let isActionEditDisabled = false;
            let attrEdit = '';
            let isActionRemove = settings.isActionRemove;
            let isActionRemoveDisabled = false;
            let attrRemove = '';

            let displayActions = null;
            if (Array.isArray(params)) {
                if (typeof params.displayActions != "undefined") {
                    displayActions = params.displayActions;
                }
            }


            if (Array.isArray(displayActions) && displayActions.length)
            {
                displayActions.map(function (action) {
                    if (typeof action.name != "undefined") {
                        if (typeof action.display != "undefined") {
                            if (action.display === false) {
                                if (isActionEdit && action.name == 'edit') {
                                    isActionEdit = false;
                                }
                                if (isActionRemove && action.name == 'delete') {
                                    isActionRemove = false;
                                }
                            }
                        } else if (typeof action.disabled != "undefined") {
                            if (action.disabled === true) {
                                if (isActionEdit && action.name == 'edit') {
                                    isActionEditDisabled = true;
                                }
                                if (isActionRemove && action.name == 'delete') {
                                    isActionRemoveDisabled = true;
                                }
                            }
                        } else if (typeof action.attr != "undefined") {
                            if (action.attr.length) {
                                if (isActionEdit && action.name == 'edit') {
                                    attrEdit = action.attr;
                                }
                                if (isActionRemove && action.name == 'delete') {
                                    attrRemove = action.attr;
                                }
                            }
                        }

                    }
                });
            } else {
                displayActions = [];
            }

            var callbackRenderMenu = callbackRenderMenuAction(null, params);
            var renderMenu = '';

            if (isActionEdit === true || isActionRemove === true || (callbackRenderMenu != undefined && callbackRenderMenu.length)) {
                renderMenu += '<div class="btn-group tableAction">';
                renderMenu += '<button type="button" class="btn btn-default waves-effect dropdown-toggle " data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">';
                renderMenu += '<i class="material-icons">keyboard_arrow_down</i>';
                renderMenu += '</button>';
                renderMenu += '<ul class="dropdown-menu" style="width: 182px;">';
                if (isActionEdit === true) {
                    renderMenu += '<li><a href="javascript:void(0)" ' + attrEdit + ' ' + (isActionEditDisabled ? 'disabled="disabled"' : '') + ' data-secgrid-action="edit" ><i class="material-icons bg-orange padding-5 ">create</i>&nbsp;Alterar</a></li>';
                }
                if (isActionRemove === true) {
                    renderMenu += '<li><a href="javascript:void(0)" ' + attrRemove + ' ' + (isActionRemoveDisabled ? 'disabled="disabled"' : '') + ' data-secgrid-action="remove" ><i class="material-icons bg-red padding-5 ">delete_forever</i>&nbsp;Excluir</a></li>';
                }


                var callbackRenderMenu = callbackRenderMenuAction(null, params);

                if (callbackRenderMenu) {
                    renderMenu += callbackRenderMenu;
                }
                renderMenu += '</ul>';
                renderMenu += '</div>';
            }
            return renderMenu;
        }

        _this.find('tbody').html('');
        let idTable = parseInt(Math.floor(Math.random() * 9999));
        let idItemCurrent = null;

        let totalRowThead = (settings.isRenderMenu === true) ? -1 : 0;
        _this.find('thead tr th').each(function (indexRow, elementRow) {
            totalRowThead++;
        });

        const loadEventMenuAction = function (params)
        {
            _this.find('tbody tr').each(function (indexRow, elementRow) {
                var indexRow;
                var objRow = $(this);
                var elemCell;

                objRow.unbind('click');

                objRow.each(function (index, element) {
                    elemCell = $(this);

                }).on('click', '[data-secgrid-action]', function (e) {

                    if ($(this).is('[disabled]')) {
                        return false;
                    }
                    let id = objRow.data('secgrid-id');
                    let idRow = objRow.data('secgrid-row');
                    if (typeof _Datas[idRow] == "undefined") {
                        return false;
                    }
                    _objRow = objRow;
                    let actionCurrent = $(this).data('secgrid-action');
                    if (!actionCurrent.length) {
                        return false;
                    }
                    if (actionCurrent == 'remove')
                    {
                        elemCellRemove = elemCell;
                        callbackBefore();
                        removeItem();

                    } else if (actionCurrent == 'edit') {
                        let arr_labels = [];
                        let arr_values = [];
                        elemCellRemove = null;
                        elemCell.find('td').each(function (indexRow, elementRow) {
                            let value = $(this).data('secgrid-value');
                            let text = $(this).text();
                            if (typeof value != "undefined")
                            {
                                arr_labels.push(text);
                                arr_values.push(value);
                            }
                        });
                        let datas = {
                            id: id,
                            labels: arr_labels,
                            values: arr_values
                        };
                        callbackEdit(_Datas[idRow], objRow);
                    } else if (actionCurrent != 'add') {

                        elemCellRemove = null;
                        let arr_labels = [];
                        let arr_values = [];

                        elemCell.find('td').each(function (indexRow, elementRow) {
                            let value = $(this).data('secgrid-value');
                            let text = $(this).text();
                            if (typeof value != "undefined")
                            {
                                arr_labels.push(text);
                                arr_values.push(value);
                            }
                        });
                        let datas = {
                            id: id,
                            labels: arr_labels,
                            values: arr_values
                        };
                        callbackActionCustom(_Datas[idRow], objRow, actionCurrent);
                    }

                });

            });
        }

        const addItem = function (dataItem, displayActions) {
            _objRow = null;
            if (typeof dataItem.values == "undefined" || !dataItem.values.length) {
                var msgError = 'Add item: Array values empty!';
                callbackError(dataItem);
                alert(msgError);
                return false;
            }
            if (dataItem.values.length < totalRowThead) {
                var msgError = 'Thead table:  Column number incompatible!';
                callbackError(dataItem);
                alert(msgError);
                return false;
            }
            callbackBefore();
            let idItem = dataItem.id;
            let idRow = parseInt(Math.floor(Math.random() * 9999));
            if (typeof _Datas[idRow] == "undefined") {
                _Datas[idRow] = dataItem;
            } else {
                _Datas[idRow + idRow] = dataItem;
            }
            let menu = '<tr data-secgrid-row="' + idRow + '" data-secgrid-id="' + idItem + '">';


            let params = null;
            if (typeof dataItem.params != "undefined") {
                params = dataItem.params;
            }

            menu += '<td data-secgrid-menu >' + renderMenuAction(params) + '</td>';
            dataItem.values.map(function (v, i, a) {
                var label = null;
                if (typeof dataItem.labels[i] != "undefined" && (dataItem.labels.length <= dataItem.values.length)) {
                    label = dataItem.labels[i];
                    menu += '<td data-secgrid-value="' + v + '">' + (label ? label : v) + '</td>';
                }
            });
            menu += '</tr>';
            _this.find('tbody').append(menu);

            loadEventMenuAction(params);

            if (displayActions.length)
            {
                displayActions.map(function (action) {
                    if (typeof action.name == "undefined") {
                        return;
                    }
                    let elemAction = $(`[data-secgrid-row="${idRow}"] [data-secgrid-action="${action.name}"]`);
                    if (typeof action.display != "undefined") {
                        if (action.display === true) {
                            elemAction.show();
                        } else {
                            elemAction.hide();
                        }
                    } else if (typeof action.disabled != "undefined") {
                        if (action.disabled === true) {
                            elemAction.attr('disabled', 'disabled');
                        } else {
                            elemAction.removeAttr('disabled');
                        }
                    }
                });
            }
            callbackAdd(_Datas[idRow], dataItem);
            callbackSuccess({datas: _Datas, mode: 'add'}, _this.find('tbody tr'));
        };

        const editItem = function (dataItem, displayActions) {

            if (_objRow == null) {
                return;
            }

            let idRow = _objRow.data('secgrid-row');
            if (typeof idRow == "undefined") {
                return;
            }
            let idItem = _objRow.data('secgrid-id');
            if (typeof datas == "undefined" || !dataItem.length) {
                dataItem.id = idItem;
                _objRow.find('td').each(function (indexRow, elementRow) {

                    if (indexRow > 0)
                    {
                        $(this).html(dataItem.labels[(indexRow - 1)])
                                .attr('data-secgrid-value', dataItem.values[(indexRow - 1)]);
                    } else {

                        if (displayActions.length)
                        {
                            displayActions.map(function (action) {
                                if (typeof action.name == "undefined") {
                                    return;
                                }
                                let el = $(`[data-secgrid-action="${action.name}"]`);
                                if (typeof el == "undefined") {
                                    return;
                                }
                                if (typeof action.display != "undefined") {
                                    if (action.display === true) {
                                        el.show();
                                    } else {
                                        el.hide();
                                    }
                                } else if (typeof action.disabled != "undefined") {
                                    if (action.disabled === true) {
                                        el.attr('disabled', 'disabled');
                                    } else {
                                        el.removeAttr('disabled');
                                    }
                                }

                            });
                        }
                    }
                });
                _Datas[idRow] = dataItem;
                callbackSuccess({datas: _Datas, mode: 'adit'}, _this.find('tbody tr'));
                _objRow = null;
            }
        };

        const removeItem = function (external) {
            _objRow = null;
            let idRow = elemCellRemove.data(`secgrid-row`);

            if (elemCellRemove == null) {
                return;
            }

            let datasItem = _Datas[idRow];
            var result = callbackRemove(datasItem, elemCellRemove);
            if (external !== true && result === false) {
                return false;
            }
            elemCellRemove.remove();
            delete _Datas[idRow];
            elemCellRemove = null;
            callbackSuccess({datas: _Datas, mode: 'remove'}, _this.find('tbody tr'));
        };

        const loadItems = function (datas) {

            if (typeof datas == "undefined" || !datas.length) {
                var msgError = 'Load: Datas empty!';
                callbackError(msgError);
                alert(msgError);
                return false;
            }
            let menu = '';
            let error = false;
            datas.map(function (dataItem) {

                if (!error && (typeof dataItem.values == "undefined" || !dataItem.values.length)) {
                    var msgError = 'Item: Array values empty!';
                    callbackError(dataItem);
                    alert(msgError);
                    error = true;
                    return false;
                }

                if (!error && (dataItem.values.length < totalRowThead)) {
                    var msgError = 'Thead:  Column number Incompatible!';
                    callbackError(dataItem);
                    alert(msgError);
                    error = true;
                    return false;
                }
                callbackBefore();
                let idRow = parseInt(Math.floor(Math.random() * 9999));
                _Datas[idRow] = dataItem;
                let idItem = 0;
                if (typeof dataItem.id != "undefined" && dataItem.id != '') {
                    idItem = dataItem.id;
                }

                let params = null;
                if (typeof dataItem.params != "undefined") {
                    params = dataItem.params;
                }


                menu += '<tr data-secgrid-row="' + idRow + '" data-secgrid-id="' + idItem + '">';
                menu += '<td data-secgrid-menu >' + renderMenuAction(params) + '</td>';
                dataItem.values.map(function (v, i, a) {
                    var label = null;
                    if (typeof dataItem.labels[i] != "undefined")
                    {
                        label = dataItem.labels[i];
                        menu += '<td data-secgrid-value="' + v + '">' + (label ? label : v) + '</td>';
                    }
                });
                menu += '</tr>';

            });
            if (!error) {
                _this.find('tbody').html(menu);
                loadEventMenuAction();
                callbackSuccess({datas: _Datas, mode: 'load'}, _this.find('tbody tr'));
            }
        };

        const getResultGrid = function ()
        {
            let array = new Array();
            let i;
            _Datas.map(function (item, i, a) {
                var datas = [{
                        id: item.id
                    }];



                item.values.map(function (val, i, b) {

                    let label = '';
                    if (typeof item.labels[i] != "undefined") {
                        label = item.labels[i];
                    }
                    datas.push({label: label, value: val});
                });
                array.push(datas);

            });
            if (array.length)
                return JSON.parse(JSON.stringify(array));
            return JSON.parse('[]');

        };
        return {
            version: function ()
            {
                return version;
            },
            addItem: function (datas, params)
            {
                if (typeof datas == "undefined") {
                    return;
                }
                var displayActions = [];
                if (typeof params != "undefined")
                    if (typeof params.displayActions != "undefined") {
                        if (Array.isArray(params.displayActions)) {
                            displayActions = params.displayActions
                        }

                    }
                addItem(datas, displayActions);
            },
            editItem: function (datas, params)
            {
                if (typeof datas == "undefined") {
                    return;
                }
                var displayActions = [];
                if (typeof params != "undefined")
                    if (typeof params.displayActions != "undefined") {
                        if (Array.isArray(params.displayActions)) {
                            displayActions = params.displayActions
                        }

                    }
                editItem(datas, displayActions);
            },
            removeItem: function ()
            {
                removeItem(true);
            },
            load: function (data)
            {
                loadItems(data);
            },
            getNameValues: function (idName, columnsName)
            {

                if (!Array.isArray(columnsName) || (columnsName.length < totalRowThead)) {
                    let msgError = 'Names number Incompatible!';
                    alert(msgError);
                    throw new Error(msgError);
                }

                let json = getResultGrid();
                let array = [];
                json.map(function (v, ind, a) {
                    let itemId = 0;
                    let arrayItem = {};
                    let index = 0;
                    v.map(function (item, i, a) {

                        if (idName.length && (typeof item.id != "undefined"))
                        {
                            itemId = item.id;
                            arrayItem[idName] = itemId;
                        }

                        if (typeof item.value != "undefined")
                        {
                            arrayItem[columnsName[index]] = item.value;
                            index++;
                        }
                    });
                    if (index) {
                        array.push(arrayItem);
                    }
                });
                return array;

            },
            createJson: function ()
            {
                return getResultGrid();
            }
        };
    };

}(jQuery));     