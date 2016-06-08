/**
 * @author Treagzhao
 */
var manager = null;
function ModeEntranceFactroy(global) {
    var ROBOT_FIRST = 3,
        HUMAN_FIRST = 4,
        ROBOT_ONLY = 1,
        HUMAN_ONLY = 2;
    var type;
    var robotFirst = require('./robotfirst.js');
    if(!!manager) {
        return manager;
    }
    switch(global.apiConfig.type) {
        case 3:
            manager = new robotFirst(global);
            break;
    }
    return manager;
};

module.exports = ModeEntranceFactroy;
