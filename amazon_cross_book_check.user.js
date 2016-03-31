// ==UserScript==
// @name        Amazon Cross Book Check
// @namespace   http://d.hatena.ne.jp/adda/
// @include     http://www.amazon.co.jp/*
// @include     https://www.amazon.co.jp/*
// @include     http://amazon.co.jp/*
// @include     https://amazon.co.jp/*
// @grant       GM_registerMenuCommand
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @noframes
// ==/UserScript==
//
// version: 2010.6.16 + 2016.3.31 Patch

var DEFAULT_AUTO_START = false;
var INTERVAL = 500;

var SITEINFO = [
	// 新刊書店
	{
		label: '\u30E8\u30C9\u30D0\u30B7.com', //ヨドバシ.com
		url: 'http://www.yodobashi.com/ec/category/index.html?cate=&word=',
		afterISBN: '&ginput=',
		regexp: / class="pListBlock hznBox">.*?<div class="pInfo">.*? class="red">.*?([\d,]+)/,
		isbn13: true,
		ifFound: function(checker, res){
			var content = $x('//div[contains(concat(" ",@class," ")," hznBox ")]//div[contains(concat(" ",@class," ")," pInfo ")]//span[contains(concat(" ",@class," ")," green ")]', res)[0];
			checker.content = content.textContent;
			checker.loadContent();
		}
		//disabled: true
	},
	{
		label: '\u697D\u5929\u30D6\u30C3\u30AF\u30B9', //楽天ブックス
		url: 'http://search.books.rakuten.co.jp/bksearch/nm?v=2&spv=2&e=5&sitem=',
		regexp: /<span class="rbcomp__item-list__item__price"><em>([\d,]+)/,
		isbn13: true,
		ifFound: function(checker, res){
			var content = $x("//p[@class='rbcomp__item-list__item__stock']/em", res)[0];
			checker.content = content.textContent;
			checker.loadContent();
		}
		//disabled: true
	},
	{
		label: 'honto',
		url: 'http://honto.jp/netstore/search_0730_021_10',
		afterISBN: '.html',
		regexp: /<span class="stYen"><span>([\d,]+)/,
		isbn13: true,
		ifFound: function(checker, res){
			var content = $x("//span[@class='stIconProduct03']", res)[0];
			checker.content = content.textContent;
			checker.loadContent();
		}
		//disabled: true,
	},
	// 古書店
	{
		label: 'BOOKOFF Online',
		url: 'http://www.bookoffonline.co.jp/feed/search,st=u,q=',
		regexp: /<li>\u4E2D\u53E4\u4FA1\u683C\uFF1A\uFFE5([\d,]+)<\/li>/,
		isbn13: true,
		//disabled: true
		ifFound: function(checker, res){
			checker.url = checker.url.replace("/feed/search", "/display/L001");
			checker.loadContent();
		}
	},
	{
		label: '\u30D5\u30EB\u30A4\u30C1\u30AA\u30F3\u30E9\u30A4\u30F3', // フルイチオンライン
		url: 'http://www.furu1online.net/SearchItem?FREE_WORD=',
		afterISBN: '&DISP_COUNT=12&PAGE_INDEX=1&PROP_ID_9200=2',
		regexp: /(?:\u8CA9\u58F2\u4FA1\u683C\s*|<td class="price">)<strong>([\d,]+)<\/strong>/,
		//disabled: true
	},
	{
		label: '\u30CD\u30C3\u30C8\u30AA\u30D5', // ネットオフ
		url: 'http://www.netoff.co.jp/cmdtyallsearch/hdnAllSearchFlg/1/Ctgry/*/LRack/*/SetFlg/0?word=',
		afterISBN: '&stock=1&used=0',
		regexp: /<li class="price .*?">([\d,]+)/,
		isbn13: true,
		//disabled: true
	},
	{
		label: '\u99FF\u6CB3\u5C4B', // 駿河屋
		url: 'http://www.suruga-ya.jp/search?category=&search_word=',
		regexp: /<p class="price">.*?([\d,]+)/,
		isbn13: true,
		//disabled: true
	},
	/* template
	{
		label: '',
		url: '',
		afterISBN: '',
		regexp: //,
		isbn13: ,
		mimetype: '',
		bothISBN: ,
		disabled: ,
	},
	*/
]

var PAGEINFO = [
	{
		type: 'wishlist',
		urlExp: 'wishlist',
		insertAfter: '//div[contains(concat(" ",@class," ")," g-item-details ")]/div[1]/div[1]/*[last()]',
		asinLink: '//div[contains(concat(" ",@class," ")," g-item-details ")]/div[1]/div[1]/div[1]/h5/a',
		autoStart: true
	},
	{
		type: 'bestsell',
		urlExp: '/bestsellers/',
		insertAfter: '//div[contains(concat(" ",@class," ")," zg_itemRightDiv_normal ")]/*[last()]',
		asinLink: '//div[contains(concat(" ",@class," ")," zg_itemRightDiv_normal ")]/div[contains(concat(" ",@class," ")," zg_title ")]/a[1]',
		autoStart: true
	},
	{
		type: 'recommend',
		urlExp: '/yourstore',
		insertAfter: '//table[@class="priceBox"]/tbody/tr[last()]',
		asinLink: '//td[@width="100%"]/a',
		autoStart: true
	},
	{
		type: 'listmania',
		urlExp: '/lm/',
		insertAfter: '//td[@class="listItem"]/table/*[last()]',
		asinLink: '//td[@class="listItem"]/a',
		autoStart: true
	},
	{
		type: 'history',
		urlExp: '/history/',
		insertAfter: '//div[contains(concat(" ",@class," ")," asin-faceout ")]/*[last()]',
		asinLink: '//div[contains(concat(" ",@class," ")," asin-faceout ")]/a[contains(concat(" ",@class," ")," asin-faceout-link ")][1]',
		autoStart: true
	},
	{
		type: 'search',
		urlExp: '/search/',
		insertAfter: '//li[contains(concat(" ",@class," ")," s-result-item ")]/*[last()]',
		asinLink: '//li[contains(concat(" ",@class," ")," s-result-item ")]//a[contains(concat(" ",@class," ")," s-access-detail-page ")][1]',
		autoStart: true
	},
	{
		type: 'search',
		urlExp: '/s/',
		insertAfter: '//li[contains(concat(" ",@class," ")," s-result-item ")]/*[last()]',
		asinLink: '//li[contains(concat(" ",@class," ")," s-result-item ")]//a[contains(concat(" ",@class," ")," s-access-detail-page ")][1]',
		autoStart: true
	},
	{
		type: 'category',
		urlExp: '/b?',
		insertAfter: '//li[contains(concat(" ",@class," ")," s-result-item ")]/*[last()]',
		asinLink: '//li[contains(concat(" ",@class," ")," s-result-item ")]//a[contains(concat(" ",@class," ")," s-access-detail-page ")][1]',
		autoStart: true
	},
	{
		type: 'author',
		urlExp: '/e/',
		insertAfter: '//li[contains(concat(" ",@class," ")," s-result-item ")]/*[last()]',
		asinLink: '//li[contains(concat(" ",@class," ")," s-result-item ")]//a[contains(concat(" ",@class," ")," s-access-detail-page ")][1]',
		autoStart: true
	}
]

var STYLE = '\
	table.ACBC {\
		font-size: 13px;\
		margin-top:    14px;\
		margin-bottom:  6px;\
	}\
	table.ACBC td {\
		border:none;\
	}\
	table.ACBC td.label {\
		padding-left: 1em;\
		padding-right:1em;\
	}\
	table.ACBC span.loading {\
		color: #39c;\
	}\
	table.ACBC a.notfound {\
		color: #666 !important;\
		text-decoration: none;\
		font-family: arial,verdana,helvetica,sans-serif;\
	}\
	table.ACBC a.found {\
		color: #900 !important;\
		font-weight: bold;\
		text-decoration: underline !important;\
	}\
	div.ACBC_start {\
		height: 22px;\
		padding: 8px 0 0 36px;\
		font-size: 12px;\
		color: #004B91;\
		cursor: pointer;\
		background-image: url("http://exnent.com/userjs/search_button.png");\
		background-repeat: no-repeat;\
	}\
	div.ACBC_start_hover {\
		color: #c60 !important;\
		text-decoration:underline !important;\
	}\
';

var AFTER_ACTION = [
	function(acbc){
		GM_registerMenuCommand("ACBC - csv", function(){
			var data = [];
			var header = [""];
			SITEINFO.forEach(function(info){
				header.push(info.label);
			});
			data.push(header);
			acbc.items.forEach(function(item){
				var row = [item.title];
				item.checkers.forEach(function(checker){
					row.push(checker.code);
					var content = checker.content;
					row.push(content.replace(",", ""));
				});
				if (row.length > 1) data.push(row);
			});
			openCSV(convArray2CSV(data));
		})
	},
]

function ACBC() {
	this.pinfo = {};
	this.offset = 0;
	this.items = [];
}

ACBC.prototype.boot = function(pinfo) {
	if (pinfo == undefined) {
		this.singleRun();
	} else {
		this.pinfo = pinfo;
		var startButton = document.createElement("div");
		this.startButton = startButton;
		with(startButton){
			setAttribute("id", "ACBC_start");
			setAttribute("class", "ACBC_start");
			innerHTML = "他のサイトから探す";
			addEventListener("mouseover", function(){
				startButton.setAttribute("class", "ACBC_start ACBC_start_hover");
			}, false);
			addEventListener("mouseout", function(){
				startButton.setAttribute("class", "ACBC_start");
			}, false);
			var self = this;
			addEventListener("click", function(){
				self.multiRun();
				startButton.style.display = "none";
			}, false);
		}
		if (DEFAULT_AUTO_START && this.pinfo.autoStart) {
			startButton.click();
		}
		this.insertStartButton();
		this.listenForDOMChange();
	}
	GM_addStyle((STYLE).toString());
};

ACBC.prototype.insertStartButton = function () {
	var elements = $x(this.pinfo.insertAfter);
	if (elements.length === 0) return false;
	elements[0].parentNode.appendChild(this.startButton);
	return true;
};

ACBC.prototype.listenForDOMChange = function () {
	var self = this;
	var cb = function () {
		var startButton = self.startButton;
		if (!startButton) {
			return false;
		}
		if (!document.getElementById(startButton.getAttribute("id"))) {
			self.offset = 0;
			self.insertStartButton();
			if (DEFAULT_AUTO_START && self.pinfo.autoStart) {
				startButton.click();
			} else {
				startButton.style.display = "inline";
			}
		}
		window.setTimeout(cb, 1000);
		return true;
	};
	cb();
	return true;
};

ACBC.prototype.singleRun = function(){
	var t = document.getElementById('combinedBuyBox');
	if (!t) return;
	var target = t.lastChild;
	var self = this;
	var isbn = getISBN(document.location.href);
	var item = new Item(isbn, target);
	item.launch();
}

ACBC.prototype.multiRun = function() {
	var self = this;
	var f = function() {
		var targets = $x(self.pinfo.insertAfter);
		var links = $x(self.pinfo.asinLink);
		var i = self.offset, total = targets.length;
		(function g(){
			if (i == total) return self.callAfterAction();
			var isbn = getISBN(links[i].href);
			if (isbn) {
				var item = new Item(isbn, targets[i]);
				item.title = links[i].textContent;
				self.items.push(item);
				item.launch();
			};
			i++;
			setTimeout(g, INTERVAL);
		})();
		self.offset = total;
	};
	f();
	if (window.AutoPagerize && !this.hasAddedFilter) {
		window.AutoPagerize.addFilter(f);
		this.hasAddedFilter = true;
	}
}

ACBC.prototype.callAfterAction = function(){
	var self = this;
	AFTER_ACTION.forEach(function(a){ a(self) })
}

function Item(isbn, target) {
	this.isbn = isbn;
	this.target = target;
	this.title = "";
	this.checkers = [];
}

Item.prototype.launch = function() {
	this.insertContainer();
	var self = this;
	SITEINFO.forEach( function(info, i) {
		var checker = new Checker(self, info);
		checker.index = i;
		self.checkers.push(checker);
		checker.check();
	})
}

Item.prototype.insertContainer = function() {
	var div = document.createElement("div");
	var trs = [];
	SITEINFO.forEach( function(info){
		trs.push(tagStr("tr",[
			tagStr("td",{class:"label"},[info.label]),
			tagStr("td",{class:"value"},[
				tagStr("span",{class:"loading"}, ["loading..."])
			])
		]));
	});
	var table = tagStr("table",{class:"ACBC"},[trs.join("")]);
	div.innerHTML = table;
	this.target.parentNode.insertBefore(div, this.target.nextSibling);
	this.container = div;
}

function Checker(item, info) {
	this.item = item;
	this.info = info;
	this.url = "";
	this.status = 0;
	this.content = "";
}

Checker.prototype.check = function() {
	this.url = this.buildURL();
	var self = this;
	ajax(this.url, this.info.mimetype, function(res){
		if (res.match(self.info.regexp)) {
			self.status = 1;
			if (RegExp.$1.length > 0) self.content = RegExp.$1;
		}
		if (self.info.ifFound != undefined && self.status) {
			self.info.ifFound(self, res);
		} else {
			self.loadContent();
		}
	})
}

Checker.prototype.buildURL = function() {
	var info = this.info;
	var url = info.url;
	var isbn = this.item.isbn;
	if (info.isbn13) {
		url += conv2ISBN13(isbn);
	} else if (info.bothISBN) {
		url += (conv2ISBN13(isbn) + "|" + isbn);
	} else {
		url += isbn;
	}
	if (info.afterISBN) url += info.afterISBN;
	return url;
}

Checker.prototype.loadContent = function() {
	var cell = this.item.container.firstChild.firstChild.childNodes[this.index].childNodes[1];
	cell.innerHTML = this.createLinkText();
}

Checker.prototype.createLinkText = function() {
	if (this.content.length == 0) {
		var content =	this.status ? "Found" : "NotFound";
	} else {
		var content = (this.content.match(/^[\d,]+$/)) ? "\uFFE5 "+ this.content : this.content;
	}
	var clas = this.status ? "found" : "notfound";
	return tagStr("a", {href:this.url, target:"_blank", class:clas},[content]);
}

//----[main]----

SITEINFO = SITEINFO.filter(function(i){ return !(i.disabled) });
var location = document.location.href;
var pinfo = getPageType(location);
var acbc = new ACBC();
window.addEventListener("load", function () {
	if (pinfo || getISBN(location)) acbc.boot(pinfo);
}, false);

function getPageType(url) {
	for (i = 0, len = PAGEINFO.length; i < len; i++) {
		var pinfo = PAGEINFO[i];
		if (url.indexOf(pinfo.urlExp) != -1) return pinfo;
	}
}

//----[utility]----

function getISBN(str) {
	if (str.match(/[\/\=]([\d]{9}[\dX])(?:[^\w&]|$)/)) return RegExp.$1;
}

function conv2ISBN13(str) {
	var result = "978" + str.substr(0,9);
	var checkDigit = 38;
	for (var i = 0; i < 9; i++) {
		var c = str.charAt(i);
		checkDigit += ( i % 2 == 0 )? c * 3 : c * 1;
	}
	checkDigit = (10 - (checkDigit % 10)) % 10;
	result += checkDigit;
	return result;
}

function ajax(url, minetype, onload) {
	if (typeof minetype == 'function') {
		onload = minetype;
		minetype = null;
	}
	GM_xmlhttpRequest({
		method: 'get',
		url: url,
		overrideMimeType: minetype,
		onload: function(res) {
			onload(res.responseText);
		}
	})
}

function tagStr(tag, attrs, elms){
	var str = ["<",tag];
	if (attrs instanceof Array){
		elms = attrs;
	}else{
		for(var a in attrs){
			str = str.concat([" ",a,"=","\"",attrs[a],"\""])
		}
	}
	str.push(">");
	if (typeof elms != 'undefined'){
		for(var i=0, l=elms.length; i<l; i++){str.push(elms[i])}
	}
	return str.concat(["</",tag,">"]).join("");
}

function convArray2CSV(array){
	return array.map(function(a){ return a.join(",") }).join("\n");
}

function openCSV(str){
	var w = window.open();
	w.document.open("text/csv", "replace");
	w.document.write(str);
	w.document.close();
}

function log(message) {
    console.log(message)
}

//---copy from AutoPagerize ( http://userscripts.org/scripts/show/8551 )---

function $x(xpath, doc) {
	var doc = doc || document;
	if (typeof doc == 'string') doc = createHTMLDocumentByString(doc);
	var nodes = doc.evaluate(xpath, doc, null,
		XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
	var data = [];
	for (var i = 0, len = nodes.snapshotLength; i < len; i++) {
  		data.push(nodes.snapshotItem(i));
	}
	return data;
}

function createHTMLDocumentByString(str) {
	if (document.documentElement.nodeName != 'HTML') {
		return new DOMParser().parseFromString(str, 'application/xhtml+xml')
	}
	var html = strip_html_tag(str)
	var htmlDoc = document.cloneNode(false)
	htmlDoc.appendChild(htmlDoc.importNode(document.documentElement, false))
	var fragment = createDocumentFragmentByString(html)
	try {
		fragment = htmlDoc.adoptNode(fragment)
	} catch(e) {
		fragment = htmlDoc.importNode(fragment, true)
	}
	htmlDoc.documentElement.appendChild(fragment)
	return htmlDoc
}

function strip_html_tag(str) {
	var re = /^[\s\S]*?<html(?:[ \t\r\n][^>]*)?>|<\/html[ \t\r\n]*>[\w\W]*$/ig
	return str.replace(re, '')
}

function createDocumentFragmentByString(str) {
	var range = document.createRange()
	range.setStartAfter(document.body)
	return range.createContextualFragment(str)
}
