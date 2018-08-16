!(function() {
    "use strict";

    var root = this;

    var start = new Date().getTime()
    load('classpath:scripts/functions.js')
    load('classpath:scripts/underscore-min.js')
    print("load external js with " + (new Date().getTime() - start) + " ms.")

    function changeCase(str){
        return str.toLowerCase();
    }

    var COMMAND_IMPORT = changeCase('@import'),
        COMMAND_COUNT  = changeCase('@count'),
        COMMAND_BEFORE = changeCase('@before'),
        COMMAND_REPEAT = changeCase('@repeat'),
        COMMAND_CHILDOBJECT  = changeCase('@CHILDOBJECT');

    function evalInContext(js, context) {
        context = context || {}
        //# Return the results of the in-line anonymous function we .call with the passed context
        return function() {
            var range = function(start, stop, step) {
                if (stop == null) {
                  stop = start || 0;
                  start = 0;
                }
                step = step || 1;
                var length = Math.max(Math.ceil((stop - start) / step), 0);
                return function(callback){
                    for (var idx = 0; idx < length; idx++, start += step) {
                        callback(start, idx);
                    }
                }
            };

            try{return eval(js);}catch(e){throw Error(e.message +' js: ['+ js + ']')}
        }.call(context);
    }

    var loadJson = function(name){
        var datafilePath = env['datafile.path'];
        var s = com.chenhm.common.dpt.ScriptTools.loadJS(datafilePath,name);
        return upperCaseObjectKeys(JSON.parse(s));
    };

    function log(obj){
        if(_.isString(obj) || (obj && typeof obj.constructor === 'undefined')) print(obj);
        else if(_.isObject(obj)) print(JSON.stringify(obj))
        else if(_.isRegExp(obj)) print(obj.toString())
        else print(obj)
    }

    var jt = env['jdbcTemplate'];
    var dialect = (function (jt) {
        var className = jt.getDataSource().toString().match(/driverClassName=(.*?);/);
        var match = _.find([/mysql/i, /oracle/i], function (regexp) {
            return (regexp.exec(className));
        });
        return match?match.source:'default';
    })(jt);
    log('Auto choose database dialect: ' + dialect);

    var upperCaseObjectKeys = function(item){
        for(var key in item){
            var upper = changeCase(key);
            // check if it already wasn't uppercase
            if( upper !== key ){
                item[ upper ] = item[key];
                delete item[key];
            }
        }
        return item;
    }

    var format = function(template, json){
        return template.replace(/\$\{(.*?)\}/g, function(all, key){
            return json && (key in json)? json[key] : "";
        });
    }

    var tableExtend = function(table, parentTable){
        return _.defaults(upperCaseObjectKeys(table), upperCaseObjectKeys(parentTable))
    }

    var taskList = {};
    var commitTask = function(tableName, fn){
        if(!_.isArray(taskList[tableName])){
            taskList[tableName] = [];
        }
        taskList[tableName].push(fn);
    }

    var execTasks = function(){
        var task_order = [
            'USER_GROUP', 'USER', 'CUSTOMER'
        ];

        task_order.forEach(function(tableName){
            if(_.isArray(taskList[tableName])){
                taskList[tableName].forEach(function(fn){fn()});
            }
            delete taskList[tableName];
        })

        _.values(taskList).forEach(function(task){
            if(_.isArray(task)){
                task.forEach(function(fn){fn()});
            }
        })
    }

    root.processTestcase = function(name, operate){
        var tc = loadJson(name), base = {}, count = [1];
        if(tc[COMMAND_IMPORT]){
            base = loadJson(tc[COMMAND_IMPORT])
        }
        if(tc[COMMAND_COUNT]){
            count = tc[COMMAND_COUNT]
        }

        var clean = tc[COMMAND_BEFORE];
        if(_.isArray(clean)){
            clean.forEach(function(sql){
                jt.execute(sql);
            })
        }
        var start = new Date().getTime()
        processTables(tc, count)
        execTasks();
        print("load data with " + (new Date().getTime() - start) + " ms. total record: " + totalRecord)

        function processTables(tabs, count, context){
            _.filter(_.keys(tabs), function(key){
                return !key.startsWith('@') && !key.startsWith('#')
            }).forEach(function(tableName){
                if(_.isArray(tabs[tableName])){
                    tabs[tableName].forEach(function(table){
                        processTable(tableName, tableExtend(table, base[tableName]), count, _.defaults(table,context))
                    })
                }else{
                    processTable(tableName, tableExtend(tabs[tableName], base[tableName]), count, _.defaults(tabs[tableName],context))
                }
            })
        }

        function processTable(tableName, table, count, context){
//            log(table);
            tableName = tableName.toUpperCase()
            var insert = 'INSERT INTO ' + tableName + '(';
            var delsql = 'DELETE FROM ' + tableName + ' WHERE ';
            var colNames = [], colValues = [], colVariables = [];
            var repeat = (context && context.repeat)? context.repeat : 1;
            for (var key in table){
                if(key === COMMAND_CHILDOBJECT){
                    processTables(upperCaseObjectKeys(table[key]), count, {parent: table, repeat: repeat})
                }else if(key === COMMAND_REPEAT){
                    repeat = table[COMMAND_REPEAT];
                }else{
                    if(dialect == 'mysql')
                        colNames.push('`' + key.toUpperCase() + '`')
                    else
                        colNames.push(key.toUpperCase())
                    var ret = parseColumn(table[key], context)
                    colValues.push(ret[0])
                    if(ret[1]) colVariables.push(ret[1])
                }
            }
            insert += colNames.join(',') + ')VALUES(' + colValues.join(',') + ')';
            var delwhere = []
            colNames.forEach(function (col,idx) {
                delwhere.push(col + '=' + colValues[idx])
            })
            delsql += delwhere.join(' and ');
            if(operate == 'clean')
                commitTask(tableName, _.bind(processSQL, this, delsql, colVariables, count, repeat));
            else
                commitTask(tableName, _.bind(processSQL, this, insert, colVariables, count, repeat));
        }
    }

    function parseColumn(col, context){
        if(_.isString(col)){
            if(col.match(/\$\{(.*?)\}/)){
                var ret = evalInContext(RegExp.$1 , context)
                if(ret && ret[0]){
                    return ret
                } else {
//                    throw Error('expression [' + RegExp.$1 + '] not return.')
                    return [null]
                }
            }else if(col.match(/%/)){
                return ["?", col]
            }else
                return [ "'" + col.replace(/'/g,"''") + "'"]
        }else return [JSON.stringify(col)]
    }

    var totalRecord = 0;
    function processSQL(sql, colVariables, count, repeat){
        var processArgs = function(colVariables, i, repeat_count){
            return colVariables.map(function(o){
                if(_.isFunction(o)){
                    return o(i, repeat_count);
                }else{
                    return sformat(o, java.lang.Math.round(i), java.lang.Math.round(repeat_count));
                }
            })
        }

        log(sql)
        var sformat = java.lang.String.format;
        count = evalInContext(count);

        var batchArgs = new java.util.ArrayList(1000);
        if(_.isArray(count)){
            count.forEach(function(i){
                for(var repeat_count = 1; repeat_count <= repeat; repeat_count++){
                    var arg = processArgs(colVariables, i, repeat_count)
                    log(arg)
                    batchArgs.add(Java.to(arg, "java.lang.Object[]"))
                }
            })
        }else if(_.isFunction(count)){
            count(function(i,idx){
                for(var repeat_count = 1; repeat_count <= repeat; repeat_count++){
                    var arg = processArgs(colVariables, i, repeat_count)
                    log(arg)
                    batchArgs.add(Java.to(arg, "java.lang.Object[]"))
                    if(idx != 0 && idx % 1000 === 0){
                        jt.batchUpdate(sql, batchArgs);
                        totalRecord += batchArgs.size();
                        batchArgs.clear();
                    }
                }
            })
        }

        jt.batchUpdate(sql, batchArgs);
        totalRecord += batchArgs.size();
    }
}.call(this));