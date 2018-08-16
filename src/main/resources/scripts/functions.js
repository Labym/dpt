var encrypt = function (pwd) {
    var bcrypt = org.mindrot.jbcrypt.BCrypt;
    var sformat = java.lang.String.format;
    return ['?', function (count, repeat) {
        var str = sformat(pwd, java.lang.Math.round(count), java.lang.Math.round(repeat))
        return bcrypt.hashpw(str, bcrypt.gensalt())
    }]
}

function rawsql(sql){
    return [sql];
}

function ref(exp){
    return ["?",exp]
}

function now() {
    return ["?",new Date().getTime()];
}

function now(durationInMillis) {
    return ["?",new Date().getTime()+durationInMillis];
}
