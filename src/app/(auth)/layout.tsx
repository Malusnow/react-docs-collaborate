interface DocumentIdPageProps {
  children: React.ReactNode;
}

const DocumentsLayout = ({ children }: DocumentIdPageProps) => {
    return(
        <div className="flex flex-col">
            <nav className="p-4 bg-gray-200">
                Auth navbar
            </nav>
            {children}
        </div>
    )
}

export default DocumentsLayout;