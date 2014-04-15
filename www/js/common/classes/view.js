var View;

(function() {

// this variable controls whether show / reveal / hide events are console.logged
var debug = true;

// Cached regex to split keys for `delegate`. **MUST** be the same as Backbone's.
var delegateEventSplitter = /^(\S+)\s*(.*)$/;

// Make backbone views default touch events to mouse events if there is no touch support
if (!app.touchSupport) {
	var delegateEvents = Backbone.View.prototype.delegateEvents;
	Backbone.View.prototype.delegateEvents = function(events) {
		if (!(events || (events = _.result(this, 'events')))) return this;
		var remappedEvents = {};
		for (var key in events) {
			var match = key.match(delegateEventSplitter);
			var eventName = match[1], selector = match[2];
			if (eventName in app.touchEventEquivalents) {
				eventName = app.touchEventEquivalents[eventName];
			}
			remappedEvents[eventName + (selector ? ' ' + selector : '')] = events[key];
		}
		delegateEvents.call(this, remappedEvents);
	}
}

// View
// -------------

// Views are based on Backbone Views, with specific behaviours for use as
// screens in the app.
// 
// Supported events (`on` option):
// *	`init` - before the view is shown for the first time
// *	`layout` - before the view is shown, and when the viewport is resized
// *	`visible` - after the view becomes visible
// *	`hidden` - after the view becomes hidden
View = function(id, options) {
	
	this.id = id;
	this.uniqueId = _.uniqueId('view');
	this.$el = $('#view-' + id);
	this.el = this.$el[0];
	
	this._configure(options);
	this.initialize.apply(this, arguments);
	app._views[id] = this;
	
};

_.extend(View.prototype, Backbone.Events, {
	
	// jQuery delegate for element lookup, scoped to DOM elements within the
	// current view. This should be prefered to global lookups where possible.
	$: function(selector) {
		return this.$el.find(selector);
	},
	
	// helper for looking up fields by ID within the view
	field: function(id) {
		return this.$('#view-' + this.id + '-field-' + id);
	},
		
	// Initialize is an empty function by default. Override it with your own
	// initialization logic.
	// NOTE that this method is fired when the view is constructed (i.e. on
	// page init). Use the on:init event to defer initialisation code to the
	// first time it is displayed.
	initialize: function(){},
	
	// Performs the initial configuration of a View with a set of options.
	_configure: function(options) {
		options = options || {};
		_.extend(this, _.omit(options, ['events','on']));
		this.on(options.on || {});
		
		var initialised = false;
		
		// Prepare the view to be shown for the first time
		// Triggers the init event if it has not already been triggered
		this.prepare = function() {
			
			if (initialised) return;
			initialised = true;
			
			if (options.events)
				this.delegateEvents(options.events);
			
			if (options.buttons)
				this.initButtons(options.buttons);
			
			this.initTabs();
			
			this.initLists();
			
			this.trigger('init');
			
		}
	},
	
	// Set callbacks, where `events` is a hash of
	//
	// *{"event selector": "callback"}*
	//
	//     {
	//       'mousedown .title':  'edit',
	//       'click .button':     'save'
	//       'click .open':       function(e) { ... }
	//     }
	//
	// pairs. Callbacks will be bound to the view, with `this` set properly.
	// Uses event delegation for efficiency.
	// Omitting the selector binds the event to `this.el`.
	// This only works for delegate-able events: not `focus`, `blur`, and
	// not `change`, `submit`, and `reset` in Internet Explorer.
	delegateEvents: function(events) {
		_.each(events, function(method, key) {
			if (!_.isFunction(method)) method = this[method];
			if (!method) return;

			var match = key.match(delegateEventSplitter);
			var eventName = match[1].replace(/\|/g, ' '), selector = match[2];
			
			// remap touch events to mouse events if there is no touch support
			if (!app.touchSupport && eventName in app.touchEventEquivalents)
				eventName = app.touchEventEquivalents[eventName];
			
			method = _.bind(method, this);
			var handler = function(e) {
				// stop events from being fired if the app is in transition
				if (app._inTransition) {
					return true;
				}
				method(e, this);
			};
			if (selector === '') {
				this.$el.on(eventName, handler);
			} else {
				this.$el.on(eventName, selector, handler);
			}
		}, this);
		return this;
	},
	
	// Set up buttons, where `buttons` is a hash of
	// 
	// *{"button selector": "callback"}*
	// 
	// The buttons will be initialised, and the callback provided will be
	// bound to the 'press' event.
	initButtons: function(buttons) {
		_.each(buttons, function(method, selector) {
			this.$(selector).button();
			if (!_.isFunction(method)) method = this[method];
			if (!method) return;
			
			method = _.bind(method, this);
			var handler = function(e) {
				// stop events from being fired if the app is in transition
				if (app._inTransition) {
					return true;
				}
				method(e, this);
			};
			this.$el.on('press', selector, handler);
			//this.$el.on('click', selector, handler);
		}, this);
		return this;
	},
	
	// Looks for tabs, and if found, initialises them.
	initTabs: function() {
		
		var self = this,
			tabs = this.$('.tabs');
		
		_.each(tabs, function(container) {
		
			var tabItems = $(container).find('.tab'),
				data = $(container).data();
			
			if (!tabItems.size())
				return;
			
			tabItems.each(function() {
				$(this).button().on('press', function() {
					var selected = $(this).data('tab');
					// select this tab
					$(container).find('.tab').each(function() {
						var $tab = $(this);
						$tab[$tab.data('tab') == selected ? 'addClass' : 'removeClass']('selected');
					});
					// show the container, hide the rest
					self.$('.tabs-content[data-tabs=' + data.tabs + '] .tab-content').each(function() {
						var $content = $(this);
						if ($content.data('tab') == selected) {
							$content.show();
							// scroll to the top of the container's parent
							var parent = $content.parent();
							if (parent.size())
								parent[0].scrollTop = 0;
						} else {
							$content.hide();
						}
					});
				});
			}).first().trigger('press');
			
		});
		
		/* Original - one set of tabs per view code
		var self = this,
			tabs = this.$('.tabs .tab');
		
		if (!tabs.size())
			return;
		
		tabs.each(function() {
			$(this).button().on('press', function() {
				var selected = $(this).data('tab');
				// select this tab
				self.$('.tab').each(function() {
					var $tab = $(this);
					$tab[$tab.data('tab') == selected ? 'addClass' : 'removeClass']('selected');
				});
				// show the container, hide the rest
				self.$('.tab-content').each(function() {
					var $content = $(this);
					if ($content.data('tab') == selected) {
						$content.show();
						// scroll to the top of the container's parent
						var parent = $content.parent();
						if (parent.size())
							parent[0].scrollTop = 0;
					} else {
						$content.hide();
					}
				});
			});
		}).first().trigger('press');
		
		// make swipes on the title change the current tab
		this.$('.titlebar .title').on('swipeLeft', function(e) {
			self.$('.tab.selected').next().trigger('press');
		}).on('swipeRight', function(e) {
			self.$('.tab.selected').prev().trigger('press');
		});
		*/
	
	},
	
	// Looks for lists, and if found, initialises them (only handles styles at the moment)
	initLists: function() {
		
		var self = this,
			lists = this.$('.list .item');
		
		if (!lists.size())
			return;
		
		lists.each(function() {
			$(this).button().on('press', function() {
				var selected = $(this).data('item');
				// select this tab
				self.$('.item').each(function() {
					var $list = $(this);
					$list[$list.data('item') == selected ? 'addClass' : 'removeClass']('selected');
				});
			});
		});
		
	},
	
	// Whether the view is currently visible
	isVisible: function() {
		// $log( 'Is Visible:', app.currentView() == this );
		return (app.currentView() == this);
	},
	
	// Show the view, optionally with an animation effect.
	// 
	// Animation options are `slide-up`, `slide-down`, `slide-left`, and `slide-right`
	show: function(anim) {
		
		// console.log("[show] - view [" + this.id + "]:show(" + ( anim || '' ) + ")");
		
		if (app.inTransition() || this.isVisible()) {
			// console.log("[show] - view [" + this.id + "]:show() bailing, app.inTransition: " + app.inTransition() + ", this.isVisible: " + this.isVisible());
			return;
		}
		
		var self = this;
		
		this.prepare();
		
		// set the z-index so this view appears on top of the previous one
		this.setZ(app.nextViewZ());
		
		// prepare the view
		this.$el.css('opacity', 0);
		this.$el.show();
		this.trigger('visible');
		this.trigger('layout');
		
		if (anim) {
			
			var to = '0,0,0';
			
			switch (anim) {
				case 'slide-up':
					to = '0,' + app.viewportSize.height + 'px,0';
				break;
				case 'slide-down':
					to = '0,' + (-app.viewportSize.height) + 'px,0';
				break;
				case 'slide-left':
					to = (-app.viewportSize.width) + 'px,0,0';
				break;
				case 'slide-right':
					to = app.viewportSize.width + 'px,0,0';
				break;
			}
			
			// piggyback the animate function to handle translate3d
			$.fx.off = true;
			this.$el.animate({ translate3d: to });
			this.$el.css('opacity', 1);
			$.fx.off = false;
			
			// use 10ms timeout to ensure repaint has updated the offset before the animation begins
			setTimeout(function() {
				self.$el.animate({ translate3d: '0,0,0' }, 300, 'ease', function() {
					// console.log("[show] - transition complete");
					app.currentView(self, true);
				});
			}, 10);
			
		} else {
			this.$el.css('opacity', 1);
			app.currentView(this, true);
		}
		
	},
	
	// `reveal` is like `show`, but switches up the effects so that the view is
	// revealed as if behind the current one (for navigating back, etc)
	// 
	// Supports the same animation options as `show` but the effect is applied
	// to the currently visible screen (if there is one)
	reveal: function(anim) {
		
		console.log("[reveal] - view [" + this.id + "]:reveal(" + ( anim || '' ) + ")");
		
		if (app.inTransition() || this.isVisible()) {
			console.log("[reveal] - view [" + this.id + "]:reveal() bailing, app.inTransition: " + app.inTransition() + ", this.isVisible: " + this.isVisible());
			return;
		}
		
		var self = this,
			prevView = app.currentView();
		
		if (!prevView) {
			return this.show();
		}
		
		this.prepare();
		
		// set z-indexes so the current view appears on top of this one
		prevView.setZ(app.nextViewZ());
		this.setZ(app.lastViewZ());
		
		// prepare the view
		this.$el.show();
		this.trigger('visible');
		this.trigger('layout');
		
		if (anim) {
			
			// console.log("[reveal] - view [" + this.id + "]:reveal starting animation");
			
			var to = '0,0,0';
			
			// piggyback the animate function to handle translate3d
			$.fx.off = true;
			prevView.$el.animate({ translate3d: to });
			$.fx.off = false;
			
			switch (anim) {
				case 'slide-up':
					to = '0,' + (-app.viewportSize.height) + 'px,0';
				break;
				case 'slide-down':
					to = '0,' + app.viewportSize.height + 'px,0';
				break;
				case 'slide-left':
					to = (-app.viewportSize.width) + 'px,0,0';
				case 'slide-right':
					to = app.viewportSize.width + 'px,0,0';
				break;
			}
			// use 10ms timeout to ensure repaint has updated the offset before the animation begins
			setTimeout(function() {
				// console.log("[reveal] - view [" + self.id + "]:reveal starting animation (timeout)");
				prevView.$el.animate({ translate3d: to }, 300, 'ease', function() {
					// console.log("[reveal] - view [" + self.id + "]:reveal animation complete");
					app.currentView(self, true);
					// reset the position of the previous view
					$.fx.off = true;
					prevView.$el.animate({ translate3d: '0,0,0' });
					$.fx.off = false;
				});
			}, 10);
			
		} else {
			this.$el.css('opacity', 1);
			this.trigger('visible');
			app.currentView(this, true);
		}
		
	},
	
	// `revealPanel` is like `reveal`, but has an offset of the target view,
	// tapping the semi-hidden view slides it back in (used for side menu)
	revealPanel: function(anim) {
		
		console.log("[revealPanel] - view [" + this.id + "]:revealPanel(" + ( anim || '' ) + ")");
		
		if (app.inTransition() || this.isVisible()) {
			console.log("[revealPanel] - view [" + this.id + "]:revealPanel() bailing, app.inTransition: " + app.inTransition() + ", this.isVisible: " + this.isVisible());
			return;
		}
		
		var self = this,
			prevView = app.currentView();
		
		if (!prevView) {
			return this.show();
		}
		
		this.prepare();
		
		// set z-indexes so the current view appears on top of this one
		prevView.setZ(app.nextViewZ());
		this.setZ(app.lastViewZ());
		
		// prepare the view
		this.$el.show();
		this.trigger('visible');
		this.trigger('layout');
		
		if (!anim) {
			$log( "[revealPanel] - drawer must be supplied with an animation." );
			return;
		}
		
		var to = '0,0,0';
		
		// piggyback the animate function to handle translate3d
		$.fx.off = true;
		prevView.$el.animate({ translate3d: to });
		$.fx.off = false;
		
		switch (anim) {
			case 'slide-up':
				to = '0,-80px,0';
			break;
			case 'slide-down':
				to = '0,80px,0';
			break;
			case 'slide-left':
				to = ( app.viewportSize.width - 37 ) + 'px,0,0';
			break;
			case 'slide-right':
				to = '-' + ( app.viewportSize.width - 47 ) + 'px,0,0';
			break;
		}
		
		// use 10ms timeout to ensure repaint has updated the offset before the animation begins
		setTimeout(function() {
		
			prevView.$el.animate({ translate3d: to }, 300, 'ease', function() {
				console.log("[revealPanel] - transition complete");
				prevView.$el.on((app.touchSupport ? 'tap' : 'click'), function(e) { app.view('menu-options').concealPanel(anim); });
				prevView.$el.on('swipeRight', function(e) { app.view('menu-options').concealPanel(anim); });
				// tell the app the transition is complete (normally handled by app.currentView(), but panels don't change the current view)
				app.doneTransition();
			});
			
			// add drop shadow
			prevView.$el.addClass( 'view-shadow' );
			
			// add obstruction
			$( '<div class="view-obstruction">' ).css( 'opacity', 0 ).appendTo( prevView.$el );
		
		}, 10);
		
	},
	
	// `concealPanel` hides a panel that was previously revealed
	concealPanel: function(anim) {
		
		console.log("[concealPanel] - view [" + this.id + "]:concealPanel(" + ( anim || '' ) + ")");
		
		var currentView = app.currentView();
		
		var self = this;
		
		currentView.$el.animate({ translate3d: '0,0,0' }, 300, 'ease', function() {
			
			app.currentView(currentView, false);
			
			$.fx.off = true;
			currentView.$el.animate({ translate3d: '0,0,0' });
			$.fx.off = false;
			
			currentView.$el.off((app.touchSupport ? 'tap' : 'click'));
			currentView.$el.off('swipeRight');
			
			// remove obstruction
			var $obstruction = currentView.$el.find( '.view-obstruction' );
				$obstruction.remove();
			
			// make sure panel is hidden
			self.$el.css({
				'display': '',
				'opacity': '',
				'transform': '',
				'z-index': ''
			});
			
			// make sure anything is scrolled up
			app.scrollContainer(self);
			
			// remove shadow
			currentView.$el.removeClass( 'view-shadow' );
			
		});
		
		// trigger view events (may or may not want to keep this, needed for hamburger button)
		currentView.trigger('visible');
		currentView.trigger('layout');
		
	},
	
	// Sets the z-index of the view
	// TODO: May need to update the z-index of contained elements also...
	setZ: function(z) {
		this.$el.css('z-index', z);
	},
	
	// Hides the current view
	hide: function() {
		
		console.log("[hide] - view [" + this.id + "]:hide()");
		
		app.hideKeyboard();
		app.scrollContainer(this);
		
		// todo: handle anim
		this.$el.hide();
		this.trigger('hidden');
		
	}
	
});

})();
