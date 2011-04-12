(function($) {
	var gallery  = {
		_create: function() {},
		_init: function() {
			// Set some flags.
			this.loaded = false;
			this.current = 0;

			// Use local variables, "this" can get confusing.
			var plugin = this;
			var container = plugin.element;
			var originals = container.find(plugin.options.selectors.originals);
				plugin.originals = originals;
			var length = originals.length;
				plugin.length = length;

			// Build our templates.
			plugin._templates();

			// Bind item clicks.
			container.delegate(plugin.options.selectors.itemcontainers, 'click', function() {
				plugin.focus($.inArray(this, plugin.itemcontainers));
			});

			// Bind drawing to resize.
			$(window).bind('resize', function() {
				plugin._redraw();
			});

			// Draw!
			plugin._draw();
		},

		// Templates for the carousel version.
		_templates: function() {
			// Define our templates.
			$.template('gallery.wrapper', '<ul class="gallery" style="margin-top: ${marginTop}px; width: ${width}px; height: ${height}px;"></ul>');
			$.template('gallery.itemcontainer', '<li></li>');
			$.template('gallery.skirt', '<div class="skirt" style="height: ${height}px;"><div class="track"><div class="liner"></div><div class="slider"></div></div></div>');
		},

		// Helper function to do all the math.
		_calculate: function() {
			var plugin = this;
			var container = plugin.element;
			var gallerymath = plugin.gallerymath;
			var length = plugin.length;

			// These values are the absolute maximum size for an item based upon the container's size.
			var maxitemwidth = container.width()/plugin.options.ratios.width;
			var maxitemheight = container.height()/plugin.options.ratios.height;
			
			// These are the calculated values based upon how the items fit in the container.
			// Width decreases until it fits all, height is a function of width.
			var gallerywidth = maxitemwidth;
			var galleryheight = 0;
			
			// Will be used to identify scale in both cases.
			var tempscale = 1;

			// The width dimension is the constrained dimension in the gallery. All widths will be the same.
			for (var i = 0; i < length; i++) {
				// Skip non-images.
				if (gallerymath[i].width == 'auto') { continue; }

				// Make sure to account for scaling due to height being greater than the container's max height.
				tempscale = Math.min(maxitemwidth/gallerymath[i].width, maxitemheight/gallerymath[i].height, 1);

				// Update the calculated width.
				gallerywidth = Math.min(tempscale * gallerymath[i].width, gallerywidth);
			}

			// Reset tempscale.
			tempscale = 1;

			// We now know the width that the gallery items will be. Calculate scaling factor for each.
			for (var i = 0; i < length; i++) {
				// Skip non-images.
				if (gallerymath[i].height == 'auto') { continue; }

				// Get the scale for the current item.
				tempscale = gallerywidth / gallerymath[i].width;

				// Update the calculated height of the gallery.
				galleryheight = Math.max(tempscale * gallerymath[i].height, galleryheight);

				// Store the values on the gallery item.
				gallerymath[i].scaledwidth = gallerywidth;
				gallerymath[i].scaledheight = tempscale * gallerymath[i].height;
			}
			
			// Reset tempscale.
			tempscale = 1;

			// If we didn't set galleryheight it is because we didn't have anything with specified scale--all jQuerty items.
			if (galleryheight == 0) {
				tempscale = gallerywidth / maxitemwidth;
				galleryheight = maxitemheight * tempscale;
			}

			// Save ourselves a variable or two.
			var temporigin = 0;
			var scaledheight = 0;

			// Now that we know the gallery's height, figure out the transformation origin for each.
			for (var i = 0; i < length; i++) {
				scaledheight = gallerymath[i].scaledheight ? gallerymath[i].scaledheight : galleryheight;
				temporigin = scaledheight - galleryheight + (plugin.options.ratios['transform-origin'] * galleryheight);
				gallerymath[i].transformOriginY = temporigin;
			}

			// And figure out where to put it.
			// 24 is the default slider height.
			var gallerytop = (container.height() - galleryheight - 24) / 2;

			// Save back our plugin global vars.
			plugin.galleryheight = galleryheight;
			plugin.gallerywidth = gallerywidth;
			plugin.gallerytop = gallerytop;
		},

		// Process the width and height of an item.
		_processitem: function(item) {
			$item = $(item);

			if (item.nodeName.toLowerCase() == 'img') {
				var temp = new Image();
				temp.src = $item.attr('src');

				var height = temp.height;
				var width = temp.width;

				return { height: height, width: width };
			} else {
				return { height:'auto', width: 'auto'};
			}
		},

		// Draw the elements on screen the first time.
		_draw: function() {
			var plugin = this;
			var container = plugin.element;
			var originals = plugin.originals;
			var length = plugin.length;
			var current = plugin.current;

			// Process the width and height of each item.
			var gallerymath = [];
			originals.each(function() {
				var processed = plugin._processitem(this);
				gallerymath.push(processed);
			});
			
			// We need to store our own representation of the gallery items outside of the HTML so we know what to do when something is added.
			plugin.gallerymath = gallerymath;

			// Calculate!
			plugin._calculate();

			// Build our HTML.
			var gallerywrapper = $.tmpl('gallery.wrapper', { marginTop: plugin.gallerytop, width: plugin.gallerywidth, height: plugin.galleryheight });
			var skirt = $.tmpl('gallery.skirt', { height: plugin.galleryheight });

			// Add in our HTML.
			originals.appendTo(gallerywrapper).wrap('<li></li>');
			container.html(gallerywrapper).append(skirt);

			// Build the slider, set the starting value.
			container.find(plugin.options.selectors.slider).slider({ max: length - 1, value: current }).bind("slide", function(event, ui) {
				plugin.focus(ui.value);
			});

			// Store the item containers.
			plugin.itemcontainers = container.find(plugin.options.selectors.itemcontainers);

			// All set!
			plugin.loaded = true;

			// Set the starting position to the first element.
			plugin.focus(current, true);
		},

		// Helper hook carousel version
		_update: function() {},

		// This happens any time something changes.
		_redraw: function() {
			var plugin = this;
			var container = plugin.element;
			var current = plugin.current;

			// Do all of our calculations.
			plugin._calculate();

			// Reset container size.
			container.find(plugin.options.selectors.gallery).css({ width: plugin.gallerywidth+'px', height: plugin.galleryheight+'px'});

			plugin._update();

			// Adjust skirt height.
			container.find(plugin.options.selectors.skirt).css({ height: plugin.galleryheight+'px' });

			// Set the focus back to where we were already.
			plugin.focus(current, true);
		},
		
		_animate: function(angle) {
			var plugin = this;
			var container = plugin.element;

			plugin.to = angle;
			container.stop().animate({angle: angle},{
				step: function(now) { plugin._position(now); },
				complete: function() { container.trigger('stop', [plugin]); }
			});
		},
		
		_position: function(angle) {
			var plugin = this;
			var container = plugin.element;
			var gallerymath = plugin.gallerymath;
			var itemcontainers = plugin.itemcontainers;
			var gallerywidth = plugin.gallerywidth;
			var galleryheight = plugin.galleryheight;

			plugin.from = angle;
			container.get(0).angle = plugin.from;

			var circle = 2 * Math.PI;
			var step = circle / (plugin.options.limit * 4);
			var start = (3/2 * Math.PI) - angle;

			itemcontainers.each(function(i) {
				var angle = start + i * step;
				
				if (angle <= circle && angle >= Math.PI) {
					this.style.display = 'block';
				} else {
					this.style.display = 'none';
					return;
				}

				var x = Math.cos(angle) * plugin.options.radius,
					y = Math.sin(angle) * plugin.options.radius * plugin.options.tilt,
					sinzerotoone = ((-Math.sin(angle) + 1)/2),
					depth = sinzerotoone/(1/(1-plugin.options.depth)) + plugin.options.depth,
					tempwidth = gallerymath[i].scaledwidth ? gallerymath[i].scaledwidth : gallerywidth,
					tempheight = gallerymath[i].scaledheight ? gallerymath[i].scaledheight : galleryheight,
					width = tempwidth * depth,
					height = tempheight * depth,
					top = y - height/2 + plugin.galleryheight/2 + 'px',
					left = Math.round(x) > 0 ? x + 'px' : 'auto',
					right = Math.round(x) < 0 ? -x + 'px' : 'auto',
					zindex = parseInt(sinzerotoone*100,10);


				$.extend(this.style, {
					width: width + "px",
					height: height + "px",
					left: left,
					right: right,
					top: top,
					zIndex: zindex
				});				
			});
		},

		// Set the focus to a particular value.
		focus: function(value, jump) {
			var plugin = this;
			var container = plugin.element;
			var length = plugin.length;
			
			// Nothing to see here, move along.
			if (value < 0 || value >= length) {
				return;
			}

			// Okay, we're definitely animating. Look out world!
			if (jump == undefined) {
				container.trigger('start', [plugin]);
			}

			// Limit is for number of items in one circle quadrant.
			var circle = 2 * Math.PI;
			var step = circle / (plugin.options.limit * 4);
			var angle = value * step;

			// Jump directly to the item?
			if (jump == undefined) {
				plugin._animate(angle);
			} else {
				plugin._position(angle);
			}
			container.find(plugin.options.selectors.slider).slider('value', value);

			plugin.current = value;
		},
		prev: function() {
			var plugin = this;
			return plugin.adjust(-1);
		},
		next: function() {
			var plugin = this;
			return plugin.adjust(1);
		},
		adjust: function(increment) {
			var plugin = this;
			var current = this.current;

			plugin.focus(current+increment);
		},
		add: function(item, index) {			
			var plugin = this;
			var container = plugin.element;

			var $item;

			if (item.jquery) {
				$item = item;
				item = $item.get(0);
			} else {
				$item = $(item);
			}

			// Process it for the math array.
			var processed = plugin._processitem(item);

			// Add it into the array for math.
			if (index != undefined) {
				plugin.gallerymath.splice(index, 0, processed);
			} else {
				plugin.gallerymath.push(processed);
			}

			// Update our length.
			var length = plugin.length++;

			// Add the item.
			if (index != undefined) {
				plugin.itemcontainers.eq(index).before($item);
			} else {
				container.find(plugin.options.selectors.gallery).append($item);				
			}
			$item.wrap('<li></li>');

			// Update our list of item containers which are collecting clicks.
			plugin.itemcontainers = container.find(plugin.options.selectors.itemcontainers);

			// If we're adding before our current, update our current index.
			if (index <= plugin.current) {
				plugin.current++;
			}
			
			// And lengthen our slider.
			container.find(plugin.options.selectors.slider).slider('option', 'max', length);

			// Redraw!
			plugin._redraw();
		},
		value: function() {
			return this.current;
		},
		iteminfo: function() {
			var plugin = this;
			return plugin.galleryitems[plugin.current];
		},
		destroy: function() {},
		options: {
			selectors: {
				'gallery' : '.gallery',
				'itemcontainers' : 'li',
				'originals' : '> *',
				'skirt' : '.skirt',
				'slider' : '.slider'
			},
			ratios: {
				'width' : 2.5,
				'height' : 1.5,
				'transform-origin' : .675,
				'first-margin' : .685,
				'subsequent-margin' : .13
			},
			limit: 4,
			radius: 300,
			depth: .25,
			tilt: 0
		}
	}

	// The changes needed to turn it into Cover Flow.
	var coverflow = {
		_create: function() {
			$("<link>").attr({"rel":"stylesheet","type":"text/css","href":"_css/jquery.gallery.coverflow.css","media":"screen"}).appendTo(document.getElementsByTagName("head")[0]);
		},

		// Helper for coverflow version
		_update: function() {
			// Disable transitions on left, reset each li to be the correct size, re-enable transitions.
			container.find(plugin.options.selectors.itemcontainers).css({ webkitTransition: '-webkit-transform .5s' }).each(function(i) {
				$(this).css({ width: galleryitems[i].scaledwidth+'px', height: galleryitems[i].scaledheight+'px', borderBottom: galleryitems[i].scaledheight+'px solid #000', marginBottom: '-'+galleryitems[i].scaledheight+'px', webkitTransformOriginY: galleryitems[i].transformOriginY+'px' });
				$(this).find(plugin.options.selectors.items).attr({ width: galleryitems[i].scaledwidth, height: galleryitems[i].scaledheight });
			}).css({ webkitTransition: '-webkit-transform .5s, left .5s' });
		},

		// Templates for the Cover Flow version.
		_templates: function() {
			// Define our templates.
			$.template('gallery.wrapper', '<ul class="gallery" style="width: ${width}px; height: ${height}px;">${content}</ul>');
			$.template('gallery.wrapperitem', '<li style="width: ${scaledwidth}px; height: ${scaledheight}; border-bottom: ${scaledheight}px solid #000; margin-bottom: -${scaledheight}px; -webkit-transform-origin-y: ${transformOriginY}px;"><img src="${src}" width="${scaledwidth}" height="${scaledheight}" alt="${alt}"/></li>');
			$.template('gallery.skirt', '<div class="skirt" style="height: ${height}px;"><div class="track"><div class="liner"></div><div class="slider"></div></div></div>');
		},

		// Set the focus to a particular index.
		focus: function(index) {
			var plugin = this;
			var container = plugin.element;
			var items = plugin.items;
			var galleryitems = plugin.galleryitems;
			var length = plugin.length;

			// Watch out for out of bounds.
			if (index < 0 || index >= length) {
				return;
			}

			// Okay, we're definitely animating. Look out world!
			container.trigger('start', [plugin]);

			var previous = plugin.current;
			var current = index;
				this.current = current;

			container.find(plugin.options.selectors.slider).slider('value', current);

			items.eq(previous).closest('li').removeClass('focus');
			items.eq(current).closest('li').addClass('focus');

			items.eq(current).closest('li').prevAll().each(function(index) {
				$this = $(this);

				$this.css({
					left: (index * -plugin.options.ratios['subsequent-margin'] * plugin.gallerywidth - plugin.options.ratios['first-margin'] * plugin.gallerywidth),
					zIndex: length - (index + 1)
				});
				if (index >= plugin.options.limit) {
					$this.hide();
				} else {
					$this.show();
				}
			});
			items.eq(current).closest('li').show().css({
				left: '0px',
				zIndex: length.toString()
			});
			items.eq(current).closest('li').nextAll().each(function(index) {
				$this = $(this);

				$this.css({
					left: (index * plugin.options.ratios['subsequent-margin'] * plugin.gallerywidth + plugin.options.ratios['first-margin'] * plugin.gallerywidth),
					zIndex: length - (index + 1)
				});
				if (index >= plugin.options.limit) {
					$this.hide();
				} else {
					$this.show();
				}
			});
		}
	}
	
	// If coverflow is supported, use it.
	if (false) {
		$.extend(gallery, coverflow);
	}

	// Create our widget.
	$.widget("ui.gallery", gallery);
})(jQuery);

// TODO: Add in buttons for horizontal scrollbar.
// FIXME: Fix adding 'angle' to the container's expando.
// TODO: Support typical keyboard, mouse, and touch interactions.
// TODO: Add in loading animation for images.
// TODO: Debounce gallery resize.
// TODO: Force absolute minimum sizes.