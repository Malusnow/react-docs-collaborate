interface DocumentIdPageProps {
  children: React.ReactNode;
}

const DocumentsLayout = ({ children }: DocumentIdPageProps) => {
    return(
        <div className="flex flex-col">
            {children}
        </div>
    )
}

export default DocumentsLayout;