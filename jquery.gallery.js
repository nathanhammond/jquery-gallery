(function($) {
	var gallery  = {
		_create: function() {},
		_init: function() {
			// Set some flags.
			this.loaded = false;
			this.current = 0;

			// Use local variables, "this" can get confusing.
			var plugin = this;
			var container = this.element;
			var items = container.find(plugin.options.selectors.items);
				plugin.items = items;
			var length = items.length;
				plugin.length = length;

			// Build our templates.
			plugin._templates();

			// Bind item clicks.
			container.delegate(plugin.options.selectors.items, 'click', function() {
				plugin.focus($.inArray(this, plugin.items));
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
			$.template('gallery.wrapper', '<ul class="gallery" style="width: ${width}px; height: ${height}px;">${content}</ul>');
			$.template('gallery.wrapperitem', '<li><img src="${src}" width="" height="" alt="${alt}"/></li>');
			$.template('gallery.skirt', '<div class="skirt" style="height: ${height}px;"><div class="track"><div class="liner"></div><div class="slider"></div></div></div>');
		},

		// Helper function to do all the math.
		_calculate: function() {
			var plugin = this;
			var container = this.element;
			var galleryitems = this.galleryitems;
			var length = this.length;

			// These values are the absolute maximum size for an item based upon the container's size.
			var maxitemwidth = container.width()/plugin.options.ratios.width;
			var maxitemheight = container.height()/plugin.options.ratios.height;
			
			// These are the calculated values based upon how the items fit in the container.
			var galleryitemwidth = maxitemwidth;
			var galleryheight = 0;
			
			// Will be used to identify scale in both cases.
			var tempscale = 1;

			// The width dimension is the constrained dimension in the gallery. All widths will be the same.
			for (var i = 0; i < length; i++) {

				// Make sure to account for scaling due to height being greater than the container's max height.
				tempscale = Math.min(maxitemwidth/galleryitems[i].width, maxitemheight/galleryitems[i].height, 1);

				// Update the calculated width.
				galleryitemwidth = Math.min(tempscale * galleryitems[i].width, galleryitemwidth);
			}

			// Reset tempscale.
			tempscale = 1;

			// We now know the width that the gallery items will be. Calculate scaling factor for each.
			for (var i = 0; i < length; i++) {
				// Get the scale for the current item.
				tempscale = galleryitemwidth / galleryitems[i].width;

				// Update the calculated height of the gallery.
				galleryheight = Math.max(tempscale * galleryitems[i].height, galleryheight);

				// Store the values on the gallery item.
				galleryitems[i].scaledwidth = galleryitemwidth;
				galleryitems[i].scaledheight = tempscale * galleryitems[i].height;
			}

			// Save ourselves a variable.
			var temporigin = 0;

			// Now that we know the gallery's height, figure out the transformation origin for each.
			for (var i = 0; i < length; i++) {
				temporigin = galleryitems[i].scaledheight - galleryheight + (plugin.options.ratios['transform-origin'] * galleryheight);
				galleryitems[i].transformOriginY = temporigin;
			}
			
			// Save back our plugin global vars.
			plugin.galleryheight = galleryheight;
			plugin.galleryitemwidth = galleryitemwidth;
		},

		// Draw the elements on screen the first time.
		_draw: function() {
			var plugin = this;
			var container = this.element;
			var items = this.items;
			var length = this.length;
			var current = this.current;

			// Build information for the template.
			var galleryitems = [];
			items.each(function() {
				$item = $(this);

				var temp = new Image();
				var src = $item.attr('src');
				var alt = $item.attr('alt');

				temp.src = $item.attr('src');

				var height = temp.height;
				var width = temp.width;

				galleryitems.push({ height: height, width: width, src: src, alt: alt });
			});
			
			// We need to store our own representation of the gallery items outside of the HTML so we know what to do when something is added.
			plugin.galleryitems = galleryitems;

			// Calculate!
			plugin._calculate();

			// Build our HTML.
			var gallerywrapper = $.tmpl('gallery.wrapper', { width: plugin.galleryitemwidth, height: plugin.galleryheight });
			var content = $.tmpl('gallery.wrapperitem', galleryitems);
			var skirt = $.tmpl('gallery.skirt', { height: plugin.galleryheight });

			// Add in our HTML.
			gallerywrapper.html(content);
			container.html(gallerywrapper).append(skirt);

			// Build the slider, set the starting value.
			container.find(plugin.options.selectors.slider).slider({ max: length - 1, value: current }).bind("slide", function(event, ui) {
				plugin.focus(ui.value);
			});

			// Reset our items to be the actual ones!
			this.items = container.find(plugin.options.selectors.items);
			this.itemcontainers = container.find(plugin.options.selectors.galleryitems);

			// All set!
			this.loaded = true;

			// Set the starting position to the first element.
			plugin.focus(current);
		},

		// Helper hook carousel version
		_update: function() {},

		// This happens any time something changes.
		_redraw: function() {
			var plugin = this;
			var container = this.element;
			var galleryitems = this.galleryitems;
			var current = this.current;

			// Do all of our calculations.
			plugin._calculate();

			// Reset container size.
			container.find(plugin.options.selectors.gallery).css({ width: plugin.galleryitemwidth+'px', height: plugin.galleryheight+'px'});

			plugin._update();

			// Adjust skirt height.
			container.find(plugin.options.selectors.skirt).css({ height: plugin.galleryheight+'px' });

			// Set the focus back to where we were already.
			plugin.focus(current);
		},
		
		_animate: function(angle) {
			var plugin = this;
			var container = this.element;

			plugin.to = angle;
			container.stop().animate({angle: angle},{
				step: function(now) {plugin._position(now)}
			});
		},
		
		_position: function(angle) {
			var plugin = this;
			var galleryitems = plugin.galleryitems;

			plugin.from = angle;

			var circle = 2 * Math.PI;
			var step = circle / (plugin.options.limit * 4);
			var start = (3/2 * Math.PI) - angle;

			plugin.itemcontainers.each(function(index) {
				var angle = start + index * step;
				
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
					width = galleryitems[index].scaledwidth * depth,
					height = galleryitems[index].scaledheight * depth,
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

		// Set the focus to a particular index.
		focus: function(index) {
			var plugin = this;
			var container = this.element;
			var items = this.items;
			var galleryitems = this.galleryitems;
			var length = this.length;

			var circle = 2 * Math.PI;
			var step = circle / (plugin.options.limit * 4);
			var angle = index * step;

			plugin._animate(angle);
			container.find(plugin.options.selectors.slider).slider('value', index);
			
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
		add: function(item) {
			var plugin = this;
			var container = this.element;
			var length = ++this.length;

			// Add it into the array for math.
			plugin.galleryitems.push(item);

			// Add the item.
			var content = $.tmpl('gallery.wrapperitem', item);
			container.find(plugin.options.selectors.gallery).append(content);
			
			plugin.items = container.find(plugin.options.selectors.items);
			
			container.find(plugin.options.selectors.slider).slider('option', 'max', length-1);
			plugin._redraw();
		},
		destroy: function() {},
		options: {
			selectors: {
				'gallery' : '.gallery',
				'galleryitems' : '.gallery li',
				'slider' : '.slider',
				'skirt' : '.skirt',
				'items' : 'img'
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
			container.find(plugin.options.selectors.galleryitems).css({ webkitTransition: '-webkit-transform .5s' }).each(function(i) {
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
			var container = this.element;
			var items = this.items;
			var galleryitems = this.galleryitems;
			var length = this.length;

			// Watch out for out of bounds.
			if (index < 0 || index >= length) {
				return;
			}

			var previous = this.current;
			var current = index;
				this.current = current;

			container.find(plugin.options.selectors.slider).slider('value', current);

			items.eq(previous).closest('li').removeClass('focus');
			items.eq(current).closest('li').addClass('focus');

			items.eq(current).closest('li').prevAll().each(function(index) {
				$this = $(this);

				$this.css({
					left: (index * -plugin.options.ratios['subsequent-margin'] * plugin.galleryitemwidth - plugin.options.ratios['first-margin'] * plugin.galleryitemwidth),
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
					left: (index * plugin.options.ratios['subsequent-margin'] * plugin.galleryitemwidth + plugin.options.ratios['first-margin'] * plugin.galleryitemwidth),
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
// TODO: Support typical keyboard, mouse, and touch interactions.
// TODO: Come up with animation for browsers that don't support 3D.
// TODO: Add in loading animation for images.
// TODO: Make templates adjustable by changing selectors to be defined by variables.
// TODO: Debounce gallery resize.
// TODO: Force absolute minimum sizes.