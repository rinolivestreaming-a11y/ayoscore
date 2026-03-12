// AAFI Drag and Drop Module
(function() {
  'use strict';

  let dragSrc = null;
  let dragData = null;

  // Initialize drag and drop on a list
  function initDragList(container, options = {}) {
    const { onDrop, onStart, onEnd, itemSelector = '.drag-item' } = options;

    function getItems() { return container.querySelectorAll(itemSelector); }

    function addHandlers(item) {
      item.setAttribute('draggable', 'true');

      item.addEventListener('dragstart', function(e) {
        dragSrc = this;
        dragData = { id: this.dataset.id, type: this.dataset.type, index: [...getItems()].indexOf(this) };
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
        if (onStart) onStart(dragData, this);
      });

      item.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        getItems().forEach(el => el.classList.remove('over'));
        dragSrc = null;
        if (onEnd) onEnd(dragData);
        dragData = null;
      });

      item.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (this !== dragSrc) {
          getItems().forEach(el => el.classList.remove('over'));
          this.classList.add('over');
        }
      });

      item.addEventListener('dragleave', function() {
        this.classList.remove('over');
      });

      item.addEventListener('drop', function(e) {
        e.stopPropagation();
        if (this !== dragSrc) {
          const items = [...getItems()];
          const srcIdx = items.indexOf(dragSrc);
          const tgtIdx = items.indexOf(this);

          if (srcIdx < tgtIdx) {
            container.insertBefore(dragSrc, this.nextSibling);
          } else {
            container.insertBefore(dragSrc, this);
          }

          if (onDrop) {
            const newOrder = [...getItems()].map(el => el.dataset.id);
            onDrop(newOrder, dragData, tgtIdx);
          }
        }
        this.classList.remove('over');
        return false;
      });
    }

    // Initialize all existing items
    getItems().forEach(addHandlers);

    // MutationObserver for dynamically added items
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.matches && node.matches(itemSelector)) addHandlers(node);
        });
      });
    });
    observer.observe(container, { childList: true });

    return { refresh: () => getItems().forEach(addHandlers) };
  }

  // Drop zone (for dropping items INTO a zone)
  function initDropZone(zone, options = {}) {
    const { onDrop, accepts } = options;

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.style.borderColor = 'rgba(0,212,255,0.5)';
      zone.style.background = 'rgba(0,212,255,0.05)';
    });

    zone.addEventListener('dragleave', () => {
      zone.style.borderColor = '';
      zone.style.background = '';
    });

    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.style.borderColor = '';
      zone.style.background = '';

      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (accepts && !accepts.includes(data.type)) return;
        if (onDrop) onDrop(data, zone);
      } catch(err) {
        console.warn('Drop parse error:', err);
      }
    });
  }

  // Lineup drag system
  function initLineupDrag(benchContainer, pitchContainer) {
    initDragList(benchContainer, {
      itemSelector: '.drag-item',
      onDrop: (newOrder) => {
        console.log('Bench reordered:', newOrder);
      }
    });

    initDropZone(pitchContainer, {
      accepts: ['player'],
      onDrop: (data, zone) => {
        window.AAFI.showToast?.('Player Added', `Player moved to lineup`, 'success');
      }
    });
  }

  window.AAFI = window.AAFI || {};
  window.AAFI.dragdrop = { initDragList, initDropZone, initLineupDrag };

  // Auto-init drag lists
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('[data-draggable-list]').forEach(list => {
      window.AAFI.dragdrop.initDragList(list, {
        onDrop: (newOrder) => {
          console.log('New order:', newOrder);
          window.AAFI.showToast?.('Order Updated', 'List reordered', 'info', 2000);
        }
      });
    });
  });

})();
