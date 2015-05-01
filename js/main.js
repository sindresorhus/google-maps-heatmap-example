/*
Created by Sindre Sorhus
sindresorhus.com
MIT license
*/
/*global google HeatmapOverlay jQuery */
(function ($) {
	'use strict';

	var hm = {
		statMapping: {
			campaignstotal: 'Campaigns total',
			campaignsfromtoday: 'Campaigns from today',
			campaignsfromthismonth: 'Campaigns from this month',
			configstotal: 'Configs total',
			configsfromtoday: 'Configs from today',
			configsfromthismonth: 'Configs from this month'
		},
		init: function () {
			this.loadStats();

			$(function() {
				this.loadMap();
				// Shadow fallback for IE and Opera.
				if (!this.utils.supportPointerEvents) {
					$('.insetshadow').hide();
				}

				$('#fullscreen-btn').click(function () {
					this.toggleFullscreen();
				}.bind(this));

				$('#choose-dataset').click(function () {
					$('#dataset-menu').fadeIn(100);
				});
			}.bind(this));
		},
		loadMap: function () {
			var self = this;
			this.map = new google.maps.Map(document.getElementById('heatmap-area'), {
				/*jshint camelcase:false */
				zoom: 2,
				minZoom: 2,
				maxZoom: 4,
				center: new google.maps.LatLng(48.3333, 16.35),
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				disableDefaultUI: true,
				scrollwheel: true,
				draggable: true,
				navigationControl: false,
				mapTypeControl: false,
				scaleControl: false,
				disableDoubleClickZoom: false,
				backgroundColor: '#dddddd',
				styles: [{
					stylers: [{
						visibility: 'off'
					}]
				},{
					featureType: 'water',
					stylers: [
						{ visibility: 'simplified' },
						{ saturation: -100 },
						{ lightness: 45 }
					]
				},{
					featureType: 'landscape.natural',
					stylers: [
						{ visibility: 'on' },
						{ invert_lightness: true },
						{ saturation: -100 },
						{ gamma: 3 }
					]
				},{
					featureType: 'administrative.country',
					stylers: [
						{ visibility: 'simplified' },
						{ lightness: -60 }
					]
				}]
			});

			this.heatmapOverlay = new HeatmapOverlay(this.map, {
				radius: 30,
				visible: true,
				opacity: 60
			});

			// make sure to load the heatmap after the map har completely loaded
			google.maps.event.addListenerOnce(this.map, 'idle', function () {
				self.isMapLoaded = true;
			});

			// show country names when zoomed in
			google.maps.event.addListener(this.map, 'zoom_changed', function () {
				var styles = self.map.styles.slice();

				// show the labels
				styles[3].stylers[0].visibility = self.map.getZoom() > 3 ? 'on' : 'simplified';

				self.map.setOptions({ styles: styles });
			});
		},
		loadStats: function () {
			// set a static callback function name since the JSONP is static
			$.ajaxSetup({
				jsonpCallback: 'callback'
			});

			$.when(
				$.getJSON('stat.json?=?'),
				$.getJSON('countrycodes-latlong.json'),
				this.whenMapLoaded()
			).done(function (stats, latlong) {
				var activeType = 'campaignstotal';
				hm.stats = stats[0];
				hm.latlong = latlong[0];
				hm.showStat(activeType);
				hm.fillMenu(activeType);

				// bind the menu items
				$('#dataset-menu').on('click', 'li', function () {
					$(this).hide().siblings().show().parent().hide();
					hm.showStat($(this).data('type'));
				});
			});
		},
		showStat: function (type) {
			var data = [];
			var values = [];
			var sum = 0;
			var stat = this.stats[type];

			for (var cc in stat) {
				if (stat.hasOwnProperty(cc)) {
					var ccVal = stat[cc];
					var ccLatLong = this.latlong[cc];
					var output = {
						lat: ccLatLong.lat,
						lng: ccLatLong.long,
						count: ccVal
					};

					data.push(output);
					values.push(ccVal);
					sum += ccVal;
				}
			}

			var average = sum / values.length;
			hm.heatmapOverlay.setDataSet({
				max: average,
				data: data
			});

			$('#choose-dataset span').text(this.statMapping[type]);
		},
		fillMenu: function (activeType) {
			var output = '';
			var mapping = this.statMapping;

			for (var type in mapping) {
				if (type !== activeType) {
					output += '<li data-type="' + type + '">' + mapping[type] + '</li>';
				}
			}

			$('#dataset-menu').html(output);
		},
		// deferred object to check when the map is loaded
		whenMapLoaded: function () {
			var deferred = new $.Deferred();
			var interval = setInterval(function () {
				if (hm.isMapLoaded) {
					deferred.resolve();
					clearInterval(interval);
				}
			}, 500);

			return deferred.promise();
		},
		toggleFullscreen: function() {
			var $heatmapContainer = $('#heatmap-container');

			if (!this.isFullscreen) {
				var offsetTop = $heatmapContainer.offset().top - 30;
				this.isFullscreen = true;
				$heatmapContainer.css('top', offsetTop);
				$(document.body).addClass('fullscreen');
				this.map.setZoom(3);
			} else {
				this.isFullscreen = false;
				$heatmapContainer.css('top', '');
				$(document.body).removeClass('fullscreen');
				this.map.setZoom(2);
			}

			google.maps.event.trigger(this.map, 'resize');
			this.map.setCenter(new google.maps.LatLng(48.3333, 16.35));
		},
		utils: {
			supportPointerEvents: function () {
				var supports;
				var element = document.createElement('x');
				var documentElement = document.documentElement;
				var getComputedStyle = window.getComputedStyle;

				if (!('pointerEvents' in element.style)) {
					return false;
				}

				element.style.pointerEvents = 'auto';
				element.style.pointerEvents = 'x';
				documentElement.appendChild(element);
				supports = getComputedStyle && getComputedStyle(element, '').pointerEvents === 'auto';
				documentElement.removeChild(element);

				return !!supports;
			}
		}
	};

	hm.init();
})(jQuery);
