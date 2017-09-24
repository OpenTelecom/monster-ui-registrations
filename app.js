define(function(require){
	var $ = require("jquery"),
		monster = require("monster"),
		animation = true,
		globalData = {},
		dataSize = 0,
		dataCount = 10,
		page = 1;

	String.prototype.capitalize = function() {
		return this.charAt(0).toUpperCase() + this.slice(1);
	}

	var app = {
		name: "registrations",

		css: [ "app" ],

		i18n: {
			"en-US": { customCss: false },
			"fr-FR": { customCss: false },
			"ru-RU": { customCss: false },
			"es-ES": { customCss: false }
		},

		requests: {},
		subscribe: {},

		load: function(callback) {
			var self = this;

			self.initApp(function() {
				callback && callback(self);
			});
		},

		initApp: function(callback) {
			var self = this;

			self.getAnimationFlag();
			self.getCountPage();

			monster.pub("auth.initApp", {
				app: self,
				callback: callback
			});
		},

		render: function(container) {
			var self = this, parent = container || $("#monster-content"), template;

			self.getRegistrations(function(data) {
				$.each(data, function(i, elem) {
					elem.datetime = self.getDateInit(elem.initial_registration);
					elem.datetime_last_registration = self.getDateInit(elem.last_registration);
					date = elem.datetime.split(" ");
					elem.date = date[0];
				});

				globalData = data;
				dataSize = Object.keys(globalData).length;

				self.paginate(function(data) {
					template = $(monster.template(self, "app", data));

					self.renderLeft(template, data);
					self.renderBody(template, data);
					self.renderPaginate(template);

					self.bindEvents(template, parent, data, function() {
						parent.empty().append(template);
					});
				});
			});
		},

		renderLeft: function(template, data) {
			var date = "-", searchResult;
			searchResult = $(monster.template(this, "search-result", data));
			template.find(".search__result").empty().append(searchResult);
		},

		renderBody: function(template, data) {
			var self = this, tableBody = $(monster.template(this, "table-body", data)), type;
			if (self.currentBrowser() === "ie") {
				console.log("IE destroy our world...");
				tableBody.find(".details__item").each(function(i, item) {
					if ($(this).text().substr(0, $(this).text().indexOf(":")).length < 6) {
						$(this).text($(this).text().replace("\t", "\t\t\t\t"));
					} else if ($(this).text().substr(0, $(this).text().indexOf(":")).length < 15) {
						$(this).text($(this).text().replace("\t", "\t\t\t"));
					} else if ($(this).text().substr(0, $(this).text().indexOf(":")).length < 23) {
						$(this).text($(this).text().replace("\t", "\t\t"));
					}
				});
			}
			tableBody.find(".btn-details").text(this.i18n.active().main.btndetails);
			tableBody.find(".table__td-type").each(function(i, item) {
				type = $(item).attr("data-type");
				$(item).html(type.capitalize().replace(/_/g, " "));
			});
			template.find(".table__body").empty().append(tableBody);
		},

		renderPaginate: function(template) {
			var data = [], len = Math.ceil(dataSize / dataCount);

			for (var i = 0; i < len; i++) {
				if ((i + 1) == page) {
					data[i] = {page: i + 1, current: true};
				} else {
					data[i] = {page: i + 1};
				}
			}

			var paginate = $(monster.template(this, "paginate", data));
			template.find(".paginate").empty().append(paginate);

			if (page > 1) {
				template.find(".paginate__left").css("display", "inline-block")
			} else {
				template.find(".paginate__left").css("display", "none")
			}

			if (page < len) {
				template.find(".paginate__right").css("display", "inline-block")
			} else {
				template.find(".paginate__right").css("display", "none")
			}
		},

		paginate: function(callback) {
			var newData = [], j = 0,
			n = (page - 1) * dataCount,
			m = page * dataCount;

			$.each(globalData, function(i, elem) {
				if (j >= n) {
					if (j >= m) return false;
					newData[i] = elem;
				}

				j++;
			});

			callback && callback(newData);
		},

		renderUpdate: function(template, parent) {
			var self = this;
			self.paginate(function(data) {
				template = $(monster.template(self, "app", data));

				self.renderLeft(template, data);
				self.renderBody(template, data);
				self.renderPaginate(template);

				self.bindEvents(template, parent, data, function() {
					parent.empty().append(template);
				});
			});
		},

		bindEvents: function(template, parent, data, callback) {
			var self = this, firstClick = true, timeoutID, textSearch = "", kostScroll = true,
			scroll = 0, dataLen = Object.keys(data).length, inputCheck, btnRest;

			template.on("click", ".btn-details", function() {
				var html = $(this).parent().find(".details");

				$.each($(html).find(".details__item"), function(i, elem) {
					$(this).text($(this).text()
						.replace(/_/g, " ")
						.replace("fs path", "fs_path")
						.replace("user ", "user_")
						.replace("user_agent", "user agent")
						.capitalize());
				});

				monster.ui.dialog($(html[0].outerHTML), {
					title: self.i18n.active().main.header.details,
					width: "680px"
				});
			});

			template.on("mouseover", ".table__th", function() {
				$(this).addClass("table__th-hover");
			});

			template.on("mouseleave", ".table__th", function() {
				$(this).removeClass("table__th-hover");
			});

			template.on("change", "#all_checked", function() {
				$(".registrations .table__td-check .input-check").prop('checked', $(this).is(":checked"));
			});

			template.on("change", ".input-check", function() {
				if ($(".input-check").filter(function() {return $(this).is(":checked")}).size() === 0) {
					self.toggleAnim($(".registrations .table__tr-restart"), false);
					$(".table__tr:nth-last-child(2)").css("border-bottom-width", "0");
				} else {
					self.toggleAnim($(".registrations .table__tr-restart"), true);
					$(".table__tr:nth-last-child(2)").css("border-bottom-width", "1px");
				}
			});

			template.on("click", ".btn-restart", function() {
				btnRest = this;
				$(btnRest).css({
					background: "#ccc!important",
					border: "#999!inportant"
				});

				inputCheck = $(".registrations .table__td-check .input-check").filter(function() {
					return $(this).is(":checked");
				});

				$(inputCheck).each(function(i, item) {
					self.callApi({
						resource: "device.restart",
						data: {
							accountId: self.accountId,
							deviceId: $(item).closest(".table__tr").attr("data-id")
						},
						success: function(data) {
							if (i === $(inputCheck).size() - 1) {
								$(btnRest).css({
									background: "",
									border: ""
								});
								self.toggleAnim($(".restart-message"), true);
								setTimeout(function() {
									self.toggleAnim($(".restart-message"), false);
								}, 3000);
							}
						}
					});
				});
			});

			template.on("click", ".table__th", function() {
				if (!$(this).hasClass("table__th-check") && !$(this).hasClass("table__th-details")) {
					if ($(this).hasClass("table__th-active")) {
						firstClick = false;

						if(!$(this).hasClass("table__th-reverse")) {
							$(this).addClass("table__th-reverse");
						} else {
							$(this).removeClass("table__th-reverse");
						}
					} else {
						firstClick = true;
					}

					$(".table__th:not(.table__th-details, .table__th-check)").not(this).removeClass("table__th-reverse").removeClass("table__th-active");
					$(this).addClass("table__th-active");

					self.sortData(data, $(this).attr("data-sort"), firstClick, function(data) {
						self.renderLeft(template, data);
						self.renderBody(template, data);
					});
				}
			});

			template.on("click", ".showall", function(e) {
				self.toggleAnim($(this), false);
				$(".search__text").val("");
				$(".search__item").removeClass("search__item-active");
				self.toggleAnim(template.find(".table__tr:not(.table__tr-restart), .search__item"), true);
			});

			template.on("focus", ".search__text", function(e) {
				$(".search__item").removeClass("search__item-active");
			});

			template.on("keyup", ".search__text", function(e) {
				clearTimeout(timeoutID);

				if ($(this).val() != "") {
					timeoutID = setTimeout(function () {
						textSearch = $(".search__text").val().toLowerCase();

						$.each(template.find(".table__tr:not(.table__tr-restart)"), function (i, elem) {
							if ($(this).find(".table__td:not(.table__td-details)").text().toLowerCase().indexOf(textSearch) == -1) {
								self.toggleAnim(template.find(".search__item[data-callid='" + $(this).attr("data-callid") + "']"), false);
								self.toggleAnim($(this), false);
							} else {
								self.toggleAnim(template.find(".search__item[data-callid='" + $(this).attr("data-callid") + "']").add($(this)), true);
							}
						});

						setTimeout(function() {
							if (template.find(".table__tr:not(.table__tr-restart)").filter(function() {return $(this).css("display") != "none"}).size() != dataLen) {
								self.toggleAnim(template.find(".showall"), true);
							} else {
								self.toggleAnim(template.find(".showall"), false);
							}
						}, 350);
					}, 500);
				} else {
					self.toggleAnim(template.find(".table__tr:not(.table__tr-restart), .search__item"), true);
					self.toggleAnim(template.find(".showall"), false);
				}
			});

			template.on("click", ".search__item", function() {
				$(".search__item").removeClass("search__item-active");
				$(this).addClass("search__item-active");

				setTimeout(function() {
					self.toggleAnim(template.find(".showall"), true);
				}, 350);

				self.toggleAnim(template.find(".table__tr:not(.table__tr-restart)[data-callid!='" + $(this).attr("data-callid") + "']"), false);
				self.toggleAnim(template.find(".table__tr:not(.table__tr-restart)[data-callid='" + $(this).attr("data-callid") + "']"), true);
			});

			$(window).on("scroll", function () {
				if (kostScroll) {
					$(".table__head").width($(".table").width() + 1);
					$(".boxbtn").width($(".boxbtn").parent().width());
					kostScroll = false;
				}
				scroll = pageYOffset || (document.documentElement.clientHeight ? document.documentElement.scrollTop : document.body.scrollTop);
				if (scroll > $(".appcont__left").height() + 34) {
					$(".boxbtn").css("position", "fixed");
				} else {
					$(".boxbtn").css("position", "static");
				}
				if (scroll > $(".registrations .table").offset().top) {
					$(".registrations .table__head").css("position", "fixed");
					$(".registrations .table__body").css("margin-top", $(".registrations .table__head").height());
				} else {
					$(".registrations .table__head").css("position", "relative");
					$(".registrations .table__body").css("margin-top", "0");
				}
			});

			template.on("click", ".up", function () {
				$("body, html").animate({scrollTop: 0}, 600);
			});

			template.on("click", ".paginate__item:not(.paginate__item-current)", function() {
				page = $(this).attr("data-page");
				self.renderUpdate(template, parent);
			});

			template.on("click", ".paginate__left", function() {
				if (page > 1) {
					page--;
					self.renderUpdate(template, parent);
				}
			});

			template.on("click", ".paginate__right", function() {
				if (page < dataSize) {
					page++;
					self.renderUpdate(template, parent);
				}
			});

			self.bindConfig(template);

			callback && callback();
		},

		bindConfig: function(template) {
			var self = this, config_template;

			self.getConfigParams(function(params) {
				template.on("click", ".config", function () {
					config_template = $(monster.template(self, "config-params", params));

					config_template.on("click", ".boxconfig__save", function () {
						localStorage.animation = "" + $("#boxconfig__animation").prop('checked');
						localStorage.dataCount = $("#boxconfig__pagination").val();

						window.location.reload();
					});

					monster.ui.dialog(config_template, {
						title: self.i18n.active().main.title_config,
						width: '480px'
					});
				});
			});
		},

		getConfigParams: function(callback) {
			var self = this, params = {},
			params_label = self.i18n.active().main.config_params;

			params.animation = {
				label: params_label.animation,
				animation_checked: (localStorage.animation == "true") ? "checked" : ""
			};
			params.pagination = {
				label: params_label.pagination,
				default_count: dataCount
			};

			callback && callback(params);
		},

		getRegistrations: function(callback) {
			var self = this;

			self.callApi({
				resource: "registrations.list",
				data: {
					accountId: self.accountId
				},
				success: function(registrations) {
					self.getDevices(registrations.data, function(data) {
						callback && callback(data);
					});
				}
			});
		},

		getDevices: function(regs, callback) {
			var self = this, kost = false;

			self.callApi({
				resource: "device.list",
				data: {
					accountId: self.accountId
				},
				success: function(devices) {
					$.each(regs, function(i, item) {
						kost = false;
						$.each(devices.data, function(j, device) {
							if (regs[i].authorizing_id === device.id) {
								item.name = device.name;
								item.type = device.device_type;
								item.enabled = device.enabled;
								item.id = device.id;

								self.getDevice(device.id, function(data) {
									if (data.sip.username) {
										item.username = data.sip.username;
									}
									kost = true;
								});

								return false;
							}
						});
					});

					var interval = setInterval(function() {
						if (kost) {
							callback && callback(regs);
							clearInterval(interval);
						}
					}, 5);
				}
			});
		},

		getDevice: function(id, callback) {
			var self = this;

			self.callApi({
				resource: "device.get",
				data: {
					accountId: self.accountId,
					deviceId: id
				},
				success: function(device) {
					callback && callback(device.data);
				}
			});
		},

		getDateInit: function(timestamp) {
			var self = this, datetime = "-";

			if (timestamp) {
				var time = new Date((timestamp - 62167219200) * 1000),
				month = self.addZero(time.getMonth() + 1),
				year = time.getFullYear(),
				day = self.addZero(time.getDate()),
				date = day + "/" + month + "/" + year,
				localTime = time.toLocaleTimeString();
				datetime = date + " " + localTime;
			}

			return datetime;
		},

		addZero: function(num) {
			return (num < 10) ? "0" + num : num;
		},

		sortData: function(data, sortBy, firstClick, callback) {
			if (firstClick && data) {
				if (sortBy == "event_timestamp" || sortBy == "initial_registration" || sortBy == "last_registration") {
					data.sort(function(elem1, elem2) {
						return elem1[sortBy] - elem2[sortBy];
					});
				} else {
					data.sort(function(elem1, elem2) {
						if (elem1[sortBy] > elem2[sortBy]) return 1;
						if (elem1[sortBy] < elem2[sortBy]) return -1;
						return 0;
					});
				}
			} else {
				data.reverse();
			}

			callback && callback(data);
		},

		getAnimationFlag: function() {
			if (localStorage.getItem("animation") === "true" ||
				(localStorage.getItem("animation") !== "false" && monster.config.developerFlags.animation === true)) {
				animation = true;
			} else {
				animation = false;
			}
		},

		getCountPage: function() {
			if (typeof localStorage.getItem("dataCount") !== "undefined" && localStorage.getItem("dataCount") > 0 ||
				(typeof localStorage.getItem("dataCount") === "undefined" && typeof monster.config.developerFlags.dataCount !== "undefined" &&
					monster.config.developerFlags.dataCount > 0)) {
				dataCount = localStorage.getItem("dataCount") || monster.config.developerFlags.dataCount;
			} else {
				dataCount = 10;
			}
		},

		toggleAnim: function(elems, visible) {
			elems = $(elems).filter(function() {
				if (visible) {
					return $(this).css("display") == "none";
				} else {
					return $(this).css("display") != "none";
				}
			});

			if (animation) {
				$(elems).toggle(200, "linear");
			} else {
				$(elems).toggle(visible);
			}
		},

		currentBrowser: function() {
			var ua = navigator.userAgent, bName, version;

			if (ua.search(/Konqueror/) > -1) bName = "konqueror";
			if (ua.search(/Iceweasel/) > -1) bName = "iceweasel";
			if (ua.search(/SeaMonkey/) > -1) bName = "seamonkey";
			if (ua.search(/Safari/) > -1) bName = "safari";
			if (ua.search(/Trident/) > -1 || ua.search(/MSIE/) > -1) bName = "ie";
			if (ua.search(/Opera/) > -1) bName = "opera";
			if (ua.search(/Chrome/) > -1) bName = "chrome";
			if (ua.search(/Firefox/) > -1) bName = "firefox";

			switch (bName) {
				case "ie": version = (ua.split("rv:")[1]).split(";")[0]; break;
				case "firefox": version = ua.split("Firefox/")[1]; break;
				case "opera": version = ua.split("Version/")[1]; break;
				case "chrome": version = (ua.split("Chrome/")[1]).split(" ")[0]; break;
				case "safari": version = (this.defElem((ua.split("Version/")[1]))) ? ua.split("Version/")[1].split(" ")[0] : ""; break;
				case "konqueror": version = this.defElem((ua.split("KHTML/")[1])).split(" ")[0]; break;
				case "iceweasel": version = this.defElem((ua.split("Iceweasel/")[1])).split(" ")[0]; break;
				case "seamonkey": version = ua.split("SeaMonkey/")[1]; break;
			}

			return bName;
		}
	};

	return app;
});