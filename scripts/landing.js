(function($){
  // Small landing page interactions
  $(function(){
    // Elevate feature blocks on scroll slightly
    const $blocks = $('.feature-block');
    const onScroll = () => {
      const vh = window.innerHeight;
      $blocks.each(function(){
        const rect = this.getBoundingClientRect();
        const visible = rect.top < vh && rect.bottom > 0;
        $(this).css('transform', visible ? 'translateY(0)' : 'translateY(6px)');
      });
    };
    onScroll();
    $(window).on('scroll', onScroll);
  });
})(jQuery);
