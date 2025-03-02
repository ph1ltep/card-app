import React from 'react';

const Modal = ({
  isOpen,
  onClose,
  children,
  title = '',
  imageSrc = null,
  fields = {},
  onFieldChange = () => {},
  buttons = [],
  status = '',
  className = '',
  overlayClassName = '',
  contentClassName = '',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${overlayClassName}`}
      onClick={onClose}
      aria-label="Modal overlay"
    >
      <div
        className={`max-w-2xl w-full mx-auto bg-gradient-to-br from-white to-gray-50 shadow-xl rounded-xl p-4 transform transition-all duration-300 ease-in-out ${contentClassName} ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {title && (
          <h2 id="modal-title" className="text-xl font-bold text-gray-800 mb-3">
            {title}
          </h2>
        )}
        {imageSrc && (
          <img src={imageSrc} alt="Card image" className="w-full h-auto max-h-[50vh] object-contain rounded-lg shadow-md mb-3" />
        )}
        {Object.keys(fields).length > 0 && (
          <div>
            <h3 className="text-base font-medium text-gray-700 mb-2">Detected Fields</h3>
            <div className="grid grid-cols-2 gap-2">
              {['name', 'email', 'phone', 'company', 'address', 'title', 'website'].map(field => (
                <div key={field} className="flex flex-col">
                  <label className="text-xs font-medium text-gray-600 capitalize">{field}</label>
                  <input
                    type="text"
                    value={fields[field] || ''}
                    onChange={(e) => onFieldChange(field, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all duration-200"
                    placeholder={`Enter ${field}`}
                    aria-label={field}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        {buttons.length > 0 && (
          <div className="mt-4 flex justify-end gap-2">
            {buttons.map((button, index) => {
              // Construct background and hover classes based on className prop
              const baseColor = button.className || 'blue-600'; // Default to blue-600 if no className
              const bgColor = `bg-${baseColor}`;
              const hoverColor = `hover:bg-${baseColor.replace('-600', '-700')}`;
              
              return (
                <button
                  key={index}
                  onClick={button.onClick}
                  className={`${bgColor} ${hoverColor} text-white rounded-lg px-4 py-2 transition-all duration-200 shadow-sm`}
                >
                  {button.text}
                </button>
              );
            })}
          </div>
        )}
        {status && <p className="mt-2 text-xs text-gray-600">{status}</p>}
        {children}
      </div>
    </div>
  );
};

export default Modal;