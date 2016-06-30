/*
* @author denzel
*/
var ListMsgHandler = function() {
    var global,
        currentState,//当前聊天对象状态  1 智能机器人  2人工客服
        scrollHanlder,
        uploadImgToken,//锁定当前上传图片唯一标识
        isUploadImg=true,//是否为上传图片操作
        startScrollY,//原始开始滚动高度  暂未使用
        inputTimer,//正在输入处理
        scrollerInitHeight,//滚动区域高度
        adminTime=0,//客户超时时间 默认为 0
        userTime=0,//用户超时时间 默认为 0
        userTimer,//用户超时任务
        adminTimer,//客服超时任务
        timer;//输入框高度延迟处理 解决与弹出键盘冲突

    var Comm = require('../../../common/comm.js');
    var fnEvent = require('../../../common/util/listener.js');
    var msgTemplate = require('./template.js');
    var ManagerFactory = require('../../../common/mode/mode.js');
    var Promise = require('../../../common/util/promise.js');
    var theme = require('./theme.js');
    var Scroll = require('./scroll.js');
    var QQFace = require('../util/qqFace.js')();
    var SystemHandler = require('./syshandler.js');
    var MessageHandler = require('./msghandler.js');

    var msgHandler = {},//包装消息相关方法 对象方法
        sysHander = {},//包装系统和配置方法 对象方法
        msgSendIdHander=[],//填装发送消息的容器 用于与消息确认匹配
        msgAcknowledgementHandler={},//消息确认容器
        // beingTyped=[],//正在输入
        // uploadImgHandler=[],//上传图片容器
        sysMsgManager=[];//系统提示管理  排队中  不在线等提示

    var systemHandler,//系统模块
        messageHandler;//消息模块



    // queue:用户排除中  offline:客服不在线  blacklist:被拉黑
    var sysMsgList=['queue','offline','blacklist'];//用于系统提示管理的状态码

    //Dom元素
    var topTitleBar,//顶部栏
        userChatBox,//用户聊天内容背景色
        chatMsgList,//聊天窗体
        wrapScroll,//滚动窗体
        scrollChatList,//滚动区域
        pullDown,//下拉刷新
        chatPanelList,//滚动列表
        progress,//进度条
        shadowLayer,//上传图片蒙板
        wrapBox;//页面

    //消息状态-类
    var MSGSTATUSCLASS={
      MSG_LOADING:'msg-loading',//正在发送
      MSG_LSSUED:'msg-lssued',//已发送
      MSG_SERVED:'msg-served',//已送达
      MSG_FAIL:'msg-fail',//发送失败
      MSG_CLOSE:'msg-close',//关闭发送  图片仅有
      MSG_SENDAGAIN:'msg-sendAgain'//重发图片
    };
    //系统提示
    var sysPromptLan ={
      L0001:'您与{0}的会话已经结束',
      L0002:'您已经很长时间未说话了哟，有问题尽管咨询',
      L0003:'您已在新窗口打开聊天页面',
      L0004:'客服正在输入...'
    };

    //api接口
    var api = {
        url_keepDetail : '/chat/user/getChatDetailByCid.action',
        url_detail : '/chat/user/chatdetail.action'
    };
    //展示历史记录 type 用于判断加载第一页数据
    //isFirstData 是否是刚进入页面
    var showHistoryMsg = function(data,isFirstData) {
      // console.log(data);
        var comf,
            sysHtml ='',
            dataLen = data.length,
            item = '',
            itemLan = 0,
            itemChild = '',
            msgHtml = '',
            userLogo = 'http://img.sobot.com/console/common/face/user.png',
            customLogo = '',
            oldTime='',//上一次时间
            tempHtml = '',
            reg = /target="_self"/g;
        if(data && data.length > 0) {
            for(var i = 0;i < dataLen;i++) {
                item = data[i].content;
                itemLan = item.length;
                for(var j = 0;j < itemLan;j++) {
                    itemChild = item[j];
                    //过滤 尼玛 忘记过滤什么了
                    // var $tmp = $('<div></div>').html(itemChild.msg);
                    // itemChild.msg = $tmp.text();
                    var index = itemChild.msg.indexOf('uploadedFile');
                    var res;
                    if(index>=0||(itemChild.msg.indexOf('<')>=0&&itemChild.msg.indexOf('>')>=0)){
                      res = itemChild.msg;
                    }else{
                      res=Comm.getNewUrlRegex(itemChild.msg);
                    }
                    //用户
                    if(itemChild.senderType === 0) {
                        comf = $.extend({
                            'userLogo' : itemChild.senderFace,
                            'userMsg' : QQFace.analysis(res),
                            'date':itemChild.t,
                            'msgLoading':MSGSTATUSCLASS.MSG_SERVED//历史记录 标记发送成功
                        });
                        msgHtml = doT.template(msgTemplate.rightMsg)(comf);
                    } else {
                        //机器人：1    人工客服：2
                        // console.log(global.apiConfig.robotLogo);
                        // console.log(itemChild);
                        if(itemChild.sdkMsg&&itemChild.sdkMsg.answerType=='4'){
                          //FIXME 相关问题搜索
                          msgHtml = msgHandler.sugguestionsSearch(itemChild.sdkMsg,true);
                        }else{
                          comf = $.extend({
                              'customLogo' : itemChild.senderFace!=='null'?itemChild.senderFace:global.apiConfig.robotLogo,
                              'customName' : itemChild.senderName,
                              'customMsg' : res,
                              'date':itemChild.t
                          });
                          msgHtml = doT.template(msgTemplate.leftMsg)(comf);
                        }
                    }
                    //时间线显示
                    var curTime = new Date();
                    var _t = Math.abs(curTime - new Date(itemChild.ts.substr(0,itemChild.ts.indexOf(' '))))/1000/60/60/24;
                    if(oldTime){
                      var _m = Math.abs(new Date(oldTime)- new Date(itemChild.ts))/1000/60;
                      if(Number(_m)>1){
                        //大于一分钟  0 当天  1上一天 2更久历史
                        var type;
                        if(_t<=1){
                            type = 0;
                        }else{
                            type = _t>1&&_t<=2?1:2;
                        }
                        // var type = _t<=1?0:_t>1&&_t<=2?1:2;
                        // var retMsg = sysHander.getTimeLine(type,itemChild.ts);
                        var retMsg = systemHandler.sys.getTimeLine(type,itemChild.ts);
                        msgHtml += retMsg?retMsg:'';
                      }
                    }
                    oldTime = itemChild.ts;
                    tempHtml=(tempHtml+msgHtml).replace(reg,'target="_blank"');
                }
            }
            //
            updateChatList(tempHtml);
        } else {
            //没有更多消息
            global.flags.moreHistroy = false;
        }
        //刷新
        // scrollHanlder.scroll.refresh();
        if(isFirstData){
          scrollHanlder.scroll.scrollTo(0,scrollHanlder.scroll.maxScrollY);
        }else{
          setTimeout(function(){
            var _y = -($(scrollChatList).height() - scrollerInitHeight);
            // console.log($(scrollChatList).height()+':'+_y);
            scrollHanlder.scroll.scrollTo(0,_y);
            scrollerInitHeight = $(scrollChatList).height();
          },2000);
        }
    };
    //更新聊天信息列表
    var updateChatList = function(tmpHtml) {
        var _chatPanelList = chatPanelList,
            _chatPanelChildren = _chatPanelList.children();
            if(_chatPanelChildren && _chatPanelChildren.length) {
                chatPanelList.children().first().before(tmpHtml);
            } else {
                chatPanelList.append(tmpHtml);
            }
    };

    var initScroll = function(){
      scrollHanlder.scroll.on('slideDown',onPullDown);
      global.flags.moreHistroy = true;
    };
    //下拉刷新
    var onPullDown = function(){
      scrollHanlder.pullDown(function(data){
        if(data.length>0){
          showHistoryMsg(data,0);
          setTimeout(function(){
            $(pullDown).removeClass('loading');
            $(pullDown).text('下拉加载更多');
          },2000);
          global.flags.moreHistroy = true;
        }else{
          //没有历史记录
          global.flags.moreHistroy = false;
        }
      });
    };
    //发送消息绑定到页面
    /*
    *FIXME  msgType 0 发送消息  1 接入消息 2 系统消息  3系统時間 4 上传图片
    */
    var bindMsg = function(msgType,data){
      // console.log(data);
      var msgHtml='',
          comf;
      if(data){
        switch (msgType) {
          case 0:
              var msg = Comm.getNewUrlRegex(data[0]['answer'].trim());
              //FIXME 消息确认 只在与客服聊天时添加
              var msgClass = messageHandler.sys.currentState==1?MSGSTATUSCLASS.MSG_SERVED:MSGSTATUSCLASS.MSG_LOADING;
              if(messageHandler.sys.currentState==2){
                messageHandler.msg.msgSendACK.push(data[0]['dateuid']);//暂存发送消息id
                // msgSendIdHander.push(data[0]['dateuid']);//暂存发送消息id
              }
              comf = $.extend({
                  userLogo : global.userInfo.face,
                  userMsg : QQFace.analysis(msg),
                  date:data[0]['date'],
                  msgId:data[0]['dateuid'],
                  msgLoading:msgClass //消息确认
              });
              msgHtml = doT.template(msgTemplate.rightMsg)(comf);
            break;
          case 1:
              //FIXME 接收人工工作台消息
              var _type=data.type;
              var _list=data.list;
              for(var i=0;i<_list.length;i++){
                var _data = _list[i];
                //判断类型 robot human
                if(_type=='robot'){
                  //FIXME 机器人类型  answerType=4 相关搜索
                  if(_data.answerType=='4'){
                    //相关搜索
                    msgHtml += msgHandler.sugguestionsSearch(_data,false);
                  }else{
                    msgHtml +=  msgHandler.onMsgFromCustom('robot',_data);
                  }
                }else{
                  //FIXME 客服类型
                  switch (_data.type) {
                    case 202:
                      //客服发来消息
                      msgHtml += msgHandler.onMsgFromCustom('human',_data);
                      break;
                    case 204:
                      //会话结束
                      msgHtml+= msgHandler.sessionCloseHander(_data);
                      break;
                    case 205:
                      //客服正在输入
                      // msgHtml += sysHander.onSysMsgShow(sysPromptLan.L0004,_data.type);
                      msgHtml += systemHandler.sys.onSysMsgShow(sysPromptLan.L0004,_data.type,sysMsgList,sysMsgManager);
                      break;
                  }
                }
              }
            break;
          case 2:
          // console.log(data);
          //系统提示 人工，机器 人欢迎语
              var _type = data.type;
              var _data = data.data;
              //判断是否是系统回复
              if(_type=='system'){
                // msgHtml = sysHander.onSysMsgShow(_data.content,data.status);
                msgHtml = systemHandler.sys.onSysMsgShow(_data.content,data.status,sysMsgList,sysMsgManager);
              }else{
                //1 机器人  2 客服
                messageHandler.sys.currentState = _type=='robot'?1:2;
                msgHtml =  msgHandler.onMsgFromCustom(_type,_data);
              }
            break;
          case 3:
            comf = $.extend({
              sysData:data,
              date:+new Date()
            });
            msgHtml = doT.template(msgTemplate.sysData)(comf);
            break;
          case 4:
            // uploadImgToken = data[0]['token'];
            messageHandler.msg.uploadImgToken = data[0]['token'];
            // uploadImgHandler.push(data[0]['token']);//图片唯一标识存进容器
            messageHandler.msg.msgSendACK.push(messageHandler.msg.uploadImgToken);//暂存发送消息id
            // msgSendIdHander.push(uploadImgToken);//暂存发送消息id
            comf = $.extend({
               userLogo : global.userInfo.face,
               uploadImg : data[0]['result'],
               progress:0,
               msgLoading:MSGSTATUSCLASS.MSG_CLOSE,
               token:data[0]['token'],
               date:data[0]['date']
           });
            msgHtml = doT.template(msgTemplate.rightImg)(comf);
            break;
        }
        msgHandler.updateChatMsg(msgHtml);
        scrollHanlder.scroll.refresh();//刷新
        scrollHanlder.scroll.scrollTo(0,scrollHanlder.scroll.maxScrollY);
      }
      // console.log(currentState);
    };
    //包装消息相关方法 isHistory 是否是历史记录
    msgHandler = {
      //相关搜索方法
      sugguestionsSearch:function(data,isHistory){
        if(data){
          var list = data.sugguestions;
          var comf = $.extend({
            customLogo:global.apiConfig.robotLogo,
            customName:global.apiConfig.robotName,
            list:list,
            isHistory:isHistory,
            stripe:data.stripe
          });
          var msg = doT.template(msgTemplate.listSugguestionsMsg)(comf);
          return msg;
        }
        return '非常对不起哦，不知道怎么回答这个问题呢，我会努力学习的。';
      },
      //发送消息
      onSend : function(data){
        // console.log(data);
        if(data[0].sendAgain){
          //消息重发
          var oDiv = $('#userMsg'+data[0].oldMsgId).parents('div.rightMsg');
          chatPanelList.append(oDiv);
        }else{
          //非图片
          if(data[0]['token']==''){
            bindMsg(0,data);
          }
        }
      },
      //接收回复
     onReceive : function(data){
       //判断当前聊天状态
       if(data.type==='robot'){
         currentState=1;
       }else if(data.type==='human'){
         currentState=2;
       }
        bindMsg(1,data);
      },
      //相关搜索答案点击事件
     onSugguestionsEvent : function(){
        var _txt = $(this).text();
        if(_txt){
          //获取点击内容
          var _msg = _txt.substr(_txt.indexOf(':')+1,_txt.length).trim();
          fnEvent.trigger('sendArea.send',[{
                  'answer' : _msg,
                  'uid' : global.apiConfig.uid,
                  'cid' : global.apiConfig.cid,
                  'currentState':'robot',
                  'requestType':'question',
                  'date' : global.apiConfig.uid + new Date()
              }]);
        }
      },
      //上传图片
      onUpLoadImg:function(data){
        // console.log(data);
        bindMsg(4,data);
      },
      onUpLoadImgProgress:function(data){
        var $shadowLayer,
            $progress,
            oldH;
        if(isUploadImg){
            $shadowLayer = $('#img'+messageHandler.msg.uploadImgToken).find('.js-shadowLayer');
            $progress = $('#progress'+messageHandler.msg.uploadImgToken);
            oldH = $shadowLayer.height();
            isUploadImg=false;
        }
        //蒙版高度随百分比改变
        $progress.text(data+'%');
        var floatData = data/100;//获取小数
        //蒙版高度
        var cH = floatData * oldH;//获取计算后的高度值
        //计算
        var newH = oldH - cH;
        $shadowLayer.height(newH);
        if(floatData>=1){
          isUploadImg=true;//开启上传图片
          $shadowLayer.remove();
          $progress.remove();
          scrollHanlder.scroll.refresh();//刷新
        }
      },
      //回传图片路径地址
      onUploadImgUrl:function(data){
        //FIXME 若是回传上传图片路径则不需要追加消息到聊天列表 直接去替换img即可
        var $div = $('#img'+messageHandler.msg.uploadImgToken);
        $div.find('p img:first-child').remove();
        $div.find('p').html(data[0]['answer']);
        messageHandler.msg.uploadImgToken='';//置空 一个流程完成
      },
      //加欢迎语
      getHello:function(data){
        //判断智能机器人还是人工客服 1 robot 2 human
        if(data && data.length){
          messageHandler.sys.currentState = data[data.length-1].content[0]['senderType'];
        }
        showHistoryMsg(data,1);
      },
      //更新聊天记录
      updateChatMsg:function(tempHtml){
        if(chatPanelList&&chatPanelList.children().length){
            var lastDom = chatPanelList.children().last();
            var _m = Math.abs(new Date()- new Date(Number(lastDom.attr('date'))))/1000/60;
            //超一分钟 显示 时间线
            if(_m>1&&!lastDom.hasClass('sysData')){
              var _t = new Date();
              var hour = _t.getHours()>=10?_t.getHours():'0'+_t.getHours(),
                  minutes = _t.getMinutes()>=10?_t.getMinutes():'0'+_t.getMinutes(),
                  _time = '今天 '+hour+':'+minutes;
              var comf = $.extend({
                sysData:_time,
                date:+new Date()
              });
              tempHtml = doT.template(msgTemplate.sysData)(comf)+tempHtml;
            }
        }
        chatPanelList.append(tempHtml);

        //FIXME 永存消息只显示最新的一条
        if(sysMsgManager.length>1){
          var sign = sysMsgManager.shift();
          $('#'+sign).animate({'margin-top':'-50px',opacity:'0.1'},500,function(){
            $(this).remove();
          });
        }
      },
      //会话结束判断
      // 1：人工客服离线导致用户下线
      // 2：被客服移除
      // 3：被列入黑单
      // 4：长时间不说话
      // 6：有新窗口打开
      sessionCloseHander:function(data){
        clearInterval(userTimer);//停止超时提示任务
        clearInterval(adminTimer);
        var msg='';
        if(data){
          switch (data.status) {
            case 1:
            msg = Comm.format(sysPromptLan.L0001,[data.aname],true);
              break;
            case 2:
            msg = Comm.format(sysPromptLan.L0001,[data.aname],true);
              break;
            case 3:
            msg = Comm.format(sysPromptLan.L0001,[data.aname],true);
              break;
            case 4:
            msg = Comm.format($(global.apiConfig.userOutWord).text(),[data.aname],false);
              break;
            case 6:
            msg = Comm.format(sysPromptLan.L0003,[data.aname],false);
              break;
          }
        }
        var tp = +new Date();
        var comf = $.extend({
          sysMsg:msg,
          sysMsgSign:tp,
          date:tp
        });
        return doT.template(msgTemplate.sysMsg)(comf);
      },
      //消息确认方法
      msgReceived:function(data){
        var sendType,//发送类型
            answer;//发送内容
        // var isMsgId = msgSendIdHander.indexOf(data.msgId);
        var isMsgId = messageHandler.msg.msgSendACK.indexOf(data.msgId);
        if(isMsgId>=0){
          // var ran = Math.random();
          // console.log(ran);
          // if(ran>0.5){
          //   data.result='success';
          // }else{
          //   data.result='fali';
          // }
          if(data.result=='success'){
            // msgSendIdHander.splice(isMsgId,1);//从数组中删除
            messageHandler.msg.msgSendACK.splice(isMsgId,1);//从数组中删除
            $('#userMsg'+data.msgId).removeClass('error msg-loading msg-fail msg-close msg-sendAgain').addClass('msg-served');
          }else{
            //发送失败 图片  文字 两种判断
            if($('#userMsg'+data.msgId).hasClass('msg')){
              //文字
              $('#userMsg'+data.msgId).removeClass('msg-loading').addClass('error msg-fail');
            }else{
              //图片
              $('#userMsg'+data.msgId).removeClass('msg-close').addClass('error msg-sendAgain');
            }
          }
        }
      },
      //消息重发
      onMsgSendAgain:function(){
        var that = $(this);
        var sendType,//发送类型
            answer;//发送内容
        var msgId = that.attr('id').substr(7,that.attr('id').length);
        //判断当前消息是否满足重发条件 error
        if(that.hasClass('error')){
          //判断当前是图片重发   文字重发
          if(that.hasClass('msg')){
            //文字
            sendType='msg';
            that.removeClass('error msg-fail').addClass('msg-loading');
            answer = that.prev().text().trim();
          }else{
            //图片
            sendType='img';
            that.removeClass('msg-sendAgain').addClass('msg-close');//图片重发过程可点击取消
            answer = that.prev().find('p').html();
          }
          fnEvent.trigger('sendArea.send',[{
             'answer' :answer,
             'uid' : global.apiInit.uid,
             'cid' : global.apiInit.cid,
             'dateuid' : global.apiInit.uid+ +new Date(),
             'oldMsgId':msgId,
             'date': +new Date(),
             'token':msgId,
             'sendAgain':true//是否重发
          }]);
        }
      },
      //来自于客服的消息
      //type --> robot human
      onMsgFromCustom:function(type,data){
        var logo,name,msg;
        if(type=='robot'){
          // console.log(data.answer);
          msg =QQFace.analysis( data.answer?data.answer:'');//过滤表情;
          // msg = data.answer;
          logo = global.apiConfig.robotLogo;
          name = global.apiConfig.robotName;
        }else if(type=='human'){
          msg =QQFace.analysis(data.content?data.content:'');//过滤表情
          logo = data.aface;
          name = data.aname;
        }
        var index = msg.indexOf('uploadedFile');
        var res;
        //判断是否是富文本
        if(index>=0||(msg.indexOf('<')>=0 && msg.indexOf('>')>=0)){
          res = msg;
        }else{
          res = Comm.getNewUrlRegex(msg);
        }
        var comf = $.extend({
            customLogo : logo,
            customName : name,
            customMsg : res,
            date:+new Date()
          });
        var tmpHtml = doT.template(msgTemplate.leftMsg)(comf);
        return tmpHtml;
      },
      adminTipTime:function(){
        adminTimer = setInterval(function(){
          adminTime += 1;
          if(adminTime * 1000 >= global.apiConfig.adminTipTime * 1000 * 60){
          // if(adminTime * 1000 >= 1000 * 5){
            adminTime=0;//清空
            //提示客服超时语
            var data = {
              type:'system',
              status:'adminoffline',
              data:{
                content:$(global.apiConfig.adminTipWord).text(),
                status:0
              }
            };
            bindMsg(2,data);
          }
        },1000);
      },
      userTipTime:function(){
        userTimer = setInterval(function(){
          userTime += 1;
          if(adminTime * 1000 >= global.apiConfig.userTipTime * 1000 * 60){
          // if(userTime * 1000 >= 1000 * 3){
            userTime=0;//清空
            //提示客服超时语
            var data = {
              type:'system',
              status:'useroffline',
              data:{
                content:$(global.apiConfig.userTipWord).text(),
                status:0
              }
            };
            bindMsg(2,data);
          }
        },1000);
      }
    };
    //加欢迎语
    var getHello = function(data){
      //判断智能机器人还是人工客服 1 robot 2 human
      if(data && data.length){
        messageHandler.sys.currentState = data[data.length-1].content[0]['senderType'];
      }
      showHistoryMsg(data,1);
    };
    /********************************************************************************/
    /********************************************************************************/
    /*************************************基本配置**********************************/
    /********************************************************************************/
    /********************************************************************************/
    //core加载完成
    var onCoreOnload = function(data) {
        global = data[0];
        console.log(global);
        initConfig();//配置参数
        //FIXME bindListener
        fnEvent.on('sendArea.send',msgHandler.onSend);//发送内容
        fnEvent.on('core.onreceive',msgHandler.onReceive);//接收回复
        fnEvent.on('sendArea.createUploadImg',msgHandler.onUpLoadImg);//发送图片
        fnEvent.on('sendArea.uploadImgProcess',msgHandler.onUpLoadImgProgress);//上传进度条
        fnEvent.on('sendArea.uploadImgUrl',msgHandler.onUploadImgUrl);//回传图片路径
        fnEvent.on('core.initsession',getHello);//机器人欢迎语 调历史渲染接口
        // fnEvent.on('sendArea.autoSize',sysHander.onAutoSize);//窗体聊天内容可视范围
        fnEvent.on('sendArea.autoSize',systemHandler.sys.onAutoSize);//窗体聊天内容可视范围
        // fnEvent.on('core.system',sysHander.onSessionOpen);//转人工事件
        fnEvent.on('core.system',systemHandler.sys.onSessionOpen);//转人工事件
        fnEvent.on('core.msgresult',msgHandler.msgReceived);//消息确认收到通知
        //FIXME EVENT
        $('.js-chatPanelList').delegate('.js-answerBtn','click',msgHandler.onSugguestionsEvent);//相关搜索答案点击事件
        $('.js-chatPanelList').delegate('.js-msgStatus','click',msgHandler.onMsgSendAgain);//消息重发
        $('.js-chatMsgList').on('click',function(){
          //空白处点击 隐藏键盘
          fnEvent.trigger('listMsg.hideKeyboard');
        });
    };

    //初始化h5页面配置信息
    var initConfig = function() {
        theme(global,wrapBox);//主题设置
        scrollHanlder = Scroll(global,wrapBox);//初始化scroll
        scrollerInitHeight = scrollChatList.height();//获取滚动scroll初始化高度
        initScroll();//初始化&配置scroll

        systemHandler = SystemHandler(bindMsg,scrollHanlder.scroll);
        messageHandler = MessageHandler(global,bindMsg,scrollHanlder.scroll);

        // sysHander.nowTimer();//显示当前时间
        // sysHander.onBeingInput();//正在输入处理
        systemHandler.sys.nowTimer();//显示当前时间
        systemHandler.sys.onBeingInput();//正在输入处理
        msgHandler.adminTipTime();//客服超时提示
        msgHandler.userTipTime();//用户超时提示
    };
    //初始化Dom
    var parseDOM = function() {
        topTitleBar = $('.js-header-back');
        userChatBox = $('.js-userMsgOuter');
        chatMsgList = $('.js-chatMsgList');
        wrapScroll = $('.js-wrapper');
        pullDown = $('.js-pullDownLabel');
        chatPanelList = $('.js-chatPanelList');
        wrapBox = $('.js-wrapBox');
        scrollChatList = $('.js-scroller');

    };

    var bindListener = function() {
        fnEvent.on('core.onload',onCoreOnload);
    };
    var init = function() {
        parseDOM();
        bindListener();
    };
    init();

};
module.exports = ListMsgHandler;
