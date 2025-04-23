export const Button = ({ children, onClick }) => (
  <button onClick={onClick} className='bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded'>
    {children}
  </button>
);