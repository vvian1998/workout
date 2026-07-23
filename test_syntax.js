const test = `
  const showImportModal = function() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = \`
      <div class="modal-content">
        <h3>Import Data</h3>
      </div>
    \`;
    document.body.appendChild(modal);
  };
`;
console.log('Template literal works');
