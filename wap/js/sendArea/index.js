/**
 *
 * @author daijm
 */
function TextArea(window) {
    //var that = {};
    var global;
    var listener = require("../../../common/util/listener.js");
    //表情
    var ZC_Face = require('../util/qqFace.js')();
    //上传附件
    var uploadImg = require('./uploadImg.js')(); 
    /* var inputCache = {};
     //模板引擎
     var template = require('./template.js');*/

    var global;
    var $node;
    var currentCid,
        currentUid,
        answer;
        //1为机器人，2为人工
    var transferFlag=1;
    //传给聊天的url
    
    var buttonChangeHandler=function(data){
        //hide,转人工按钮隐藏,当前为人工模式
        if(data.action=="hide"){
            //2为人工
            transferFlag=2;
            $(".qqFaceTip").show();
            $uploadImg.show();
            $artificial.hide();
        }else{
            transferFlag=1;
            $uploadImg.hide();
            $artificial.show();
        }
    }
    var showSendBtnHandler = function(evt) {
        //判断当前是否为人工模式
        if(transferFlag==1){
            robotmodeButton();
        }else{
            manualmodeButton();
        }
    };
    var robotmodeButton=function(){
        var _text = $textarea.text();
        if(_text) {
            $sendBtn.show();
            $add.hide();
            hideChatAreaHandler();
            $textarea.css("width","80%");
        } else {
            $sendBtn.hide();
            hideChatAreaHandler();
            $(".add").show();
            $textarea.css("width","85%");
        }
    };
    var manualmodeButton=function(){
        var _text = $textarea.text();
        if(_text) {
            $sendBtn.show();
            $add.hide();
            //hideChatAreaHandler();
            $textarea.css("width","67%");
        } else {
            $sendBtn.hide();
            hideChatAreaHandler();
            $(".add").show();
            $textarea.css("width","85%");
            $textarea.blur();
            $textarea.focus();
        }
    };
    var onbtnSendHandler = function(evt) {
        var str = $textarea.text();
        //判断输入框是否为空
        if(str.length == 0 || /^\s+$/g.test(str)) {
            $textarea.html("")
            return false;
        } else {
            _html=ZC_Face.analysis(str)
            //通过textarea.send事件将用户的数据传到显示台
            var date= currentUid + +new Date();
            listener.trigger('sendArea.send',[{
                'answer' : str,
                'uid' : currentUid,
                'cid' : currentCid,
                'date+uid' : date,
                'date': +new Date(),
                'token':""

            }]);
        };
        //清空待发送框
        $textarea.html("");
        $textarea.blur();
        $textarea.focus();
        $sendBtn.hide();
        if(transferFlag==1){
            $textarea.css("width","85%");
        }else{
            $textarea.css("width","75%");
        }
        autoSizePhone();    
    };
    var showChatAddHandler=function(){
        //与键盘优化
        if($chatArea.hasClass("showChatAdd")){
            //隐藏
            hideChatAreaHandler();
            //1为机器人模式
            if(transferFlag==1){
                $(".addhover").hide();
                $(".add").show();
                $(".qqFaceTiphover").hide();
                $(".qqFaceTip").hide();
            }else{
                $(".addhover").hide();
                $(".add").show();
                $(".qqFaceTiphover").hide();
                $(".qqFaceTip").show();
            }
            
        } else {
            setTimeout(function(){
                //显示
                $chatArea.addClass("showChatAdd");
                $chatArea.removeClass("showChatEmotion");
                $chatAdd.show();
                $chatEmotion.hide();
                $chatArea.animate({
                    bottom : "0"
                },200);
                //1为机器人模式
                if(transferFlag==1){
                    $(".qqFaceTiphover").hide();
                    $(".qqFaceTip").hide();
                    $(".addhover").show();
                    $(".add").hide();
                }else{
                    $(".addhover").show();
                    $(".add").hide();
                    $(".qqFaceTiphover").hide();
                    $(".qqFaceTip").show();
                }
               
                autoSizePhone();
            },200)
        }
    };
    var showChatEmotionHandler=function(){
        //与键盘优化
        if($chatArea.hasClass("showChatEmotion")){
            //隐藏
            hideChatAreaHandler();
            
        } else {
            setTimeout(function(){
                //显示
                $chatArea.addClass("showChatEmotion");
                $chatArea.removeClass("showChatAdd");
                $chatAdd.hide();
                $chatEmotion.show();
                $chatArea.animate({
                    bottom : "0"
                },200);
                if(transferFlag==1){
                    $(".qqFaceTiphover").hide();
                    $(".qqFaceTip").hide();
                    $(".addhover").hide();
                    $(".add").show();
                }else{
                    var _text=$textarea.text();
                    $(".qqFaceTiphover").show();
                    $(".qqFaceTip").hide();
                    $(".addhover").hide();
                    if(_text){
                        $add.hide();
                        $sendBtn.show();
                    }else{
                        $(".add").show();
                        $sendBtn.hide();
                    }
                    
                }
                autoSizePhone();
            },200)
        }
    };
    var hideChatAreaHandler = function() {
        var _bottom="-"+215+"px";
        //console.log(_bottom);
        setTimeout(function(){
            $chatArea.removeClass("showChatAdd");
            $chatArea.removeClass("showChatEmotion");
            $chatArea.css({
                "bottom" : _bottom
            });
            autoSizePhone();
            var _text=$textarea.text();
            if(transferFlag==1){
                $(".qqFaceTiphover").hide();
                $(".qqFaceTip").hide();
                $(".addhover").hide();
                if(_text){
                    $add.hide();
                    $sendBtn.show();
                }else{
                    $(".add").show();
                    $sendBtn.hide();
                }
            }else{
                $(".qqFaceTiphover").hide();
                $(".qqFaceTip").show();
                $(".addhover").hide();
                if(_text){
                    $add.hide();
                    $sendBtn.show();
                }else{
                    $(".add").show();
                    $sendBtn.hide();
                }
            }
         },200);

    };
    //表情、加号切换
    var tabChatAreaHandler=function(){
        //当点表情按钮的时候再给加号添加切换卡类名，否则动画效果会被覆盖
        //$chatAdd.addClass("tab-active");
        var id=$(this).attr("data-id");
        //$(".tab-active").hide();
        $(id).show();
        //if(id=="#chatEmotion"){
         //   $(".keyboard").on("click",keyboardHandler)
       // }
    };
     //icon换成键盘icon
    var keyboardHandler=function(){
        //当点表情按钮的时候再给加号添加切换卡类名，否则动画效果会被覆盖
        if($emotion.hasClass("keyboard")){
            $emotion.removeClass("keyboard");
            $emotion.css("background-position","-2px -3px");
        }else{
            $emotion.addClass("keyboard");
            $emotion.css("background-position","-145px -3px");
        }
        $textarea.blur();
        $textarea.focus();
    }
     //定位光标
    var gotoxyHandler=function(data){
        //表情img标签
        var src=data[0].answer;
         //将新表情追加到待发送框里
        var _html=$textarea.html()+src;
        $textarea.html(_html);
        //显示发送按钮
        manualmodeButton()
        //调整窗体高度
        autoSizePhone();
    };
    //模拟退格
    var backDeleteHandler=function(){
        var _html=$textarea.text();
        if(_html.length==1){
            _html="";
        }else{
            _html=$.trim(_html.substring(0,_html.length-1));
        }
        //$textarea.html("");
        $textarea.text(_html);
        manualmodeButton();
        autoSizePhone();
    };
    var onImageUpload = function(data) {
        //onFileTypeHandler(data); 
        //通过textarea.send事件将用户的数据传到显示台
        var date= currentUid + +new Date();
        //var img='<img src="'+data[0].url+'">';
        listener.trigger('sendArea.send',[{
         'answer' :data[0].url,
         'uid' : currentUid,
         'cid' : currentCid,
         //时间戳
         'dateUid' : date,
         'date': +new Date(),
         'token':data[0].token
         }]);
    };
    var artificialHandler=function(){
        listener.trigger('sendArea.artificial');

    };
    //宽高自适应手机
    var autoSizePhone=function(){
        //var _height=$(".chatArea").offset().top;
        //console.log(_height);
        listener.trigger('sendArea.autoSize',$chatArea);

    };
   var parseDOM = function() {
        $chatArea=$(".js-chatArea");
        $sendBtn = $(".js-sendBtn");
        $textarea = $(".js-textarea");
        $sendarea=$(".sendarea");
        //转人工按钮
        $artificial=$(".js-artificial")
        $add = $(".js-add");
        $chatAdd = $(".js-chatAdd");
        //上传图片按钮
        $uploadImg=$(".js-uploadImg");
        //表情按钮
        $emotion = $(".js-emotion");
        $chatEmotion = $(".js-chatEmotion");
        $tab=$(".js-tab");
        //oTxt = document.getElementById("js-textarea");
    };
    var bindLitener = function() {
        //发送按钮
        $sendBtn.on("click",onbtnSendHandler);
        //qq表情
        $emotion.on("click",onEmotionClickHandler);
        $textarea.on("keyup",showSendBtnHandler);
        $textarea.on("focus",hideChatAreaHandler);
        $add.on("click",showChatAddHandler);
        $emotion.on("click",showChatEmotionHandler);
        //表情、加号切换
        $tab.on("click",tabChatAreaHandler)
        //定位光标
        listener.on("sendArea.gotoxy",gotoxyHandler);
        //模拟退格
        listener.on("sendArea.backDelete",backDeleteHandler);
        //发送图片
        listener.on("sendArea.uploadImgUrl",onImageUpload);
        $(window).on("resize",autoSizePhone);
        //转人工
        $artificial.on("click",artificialHandler);
        //是否隐藏按钮
        listener.on("core.buttonchange",buttonChangeHandler)
    };
    var onEmotionClickHandler = function() {
       listener.trigger('sendArea.faceShow');
    };
    var initPlugsin = function() {//插件
        //uploadFun = uploadImg($uploadBtn,node,core,window);
        //上传图片
        autoSizePhone();
    };
    var init = function() {
        parseDOM();
        initPlugsin();
        bindLitener();
    };
    listener.on("core.onload", function(data) {
        global = data;
        currentUid=global[0].apiInit.uid;
        currentCid=global[0].apiInit.cid;
        //将uid传入上传图片模块
        listener.trigger('sendArea.sendInitConfig',currentUid)
        init();
    });

}

module.exports = TextArea;
