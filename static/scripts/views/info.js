var app = app || {};

app.InfoView = Backbone.View.extend({
  initialize: function(){
    var self = this;

    $.when($.get('/static/scripts/templates/info.handlebars'))
     .done(function(tmpl){
      self.tmpl = tmpl;
      self.render()
     });
    _.bindAll(this, 'render');
  },

  render: function() {
    var source = $(this.tmpl).html()
      , tmpl = Handlebars.compile(source)
      , html = tmpl({authenticated: app.authenticated});

    this.$el.append(html);
  },

  events: {
    "click #icon, #remove": "toggleView"
  },

  toggleView: function(ev) {
    if (!this.$el.hasClass('expanded')) {
      this.$el.addClass('expanded')
      this.$el.find('#icon').addClass('hide');
      this.$el.find('#additional_info').removeClass('hide');
      console.log('doesnt have class!!!');
    } else {
      this.$el.removeClass('expanded');
      this.$el.find('#icon').removeClass('hide');
      this.$el.find('#additional_info').addClass('hide');
    }
  }
})