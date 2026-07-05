import {
  ExternalLinkIcon,
  FilePenIcon,
  MoreVertical,
  TrashIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { RemoveDialog } from "@/components/remove-dialog";
import { RenameDialog } from "@/components/rename-dialog";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

import { Id } from "../../../convex/_generated/dataModel";

interface DocumentMenuProps {
  documentId: Id<"documents">;
  title: string;
  onNewTab: (id: Id<"documents">) => void;
}

export const DocumentMenu = ({
  documentId,
  title,
  onNewTab,
}: DocumentMenuProps) => {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onSelect={() => setIsRenameDialogOpen(true)}
          onClick={(e) => e.stopPropagation()}
        >
          <FilePenIcon className="size-4 mr-2" />
          Rename
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => setIsRemoveDialogOpen(true)}
          onClick={(e) => e.stopPropagation()}
        >
          <TrashIcon className="size-4 mr-2" />
          Remove
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onNewTab(documentId)}>
          <ExternalLinkIcon className="size-4 mr-2" />
          Open in a new tab
        </DropdownMenuItem>
      </DropdownMenuContent>
      <RenameDialog
        documentId={documentId}
        initialTitle={title}
        open={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
      />
      <RemoveDialog
        documentId={documentId}
        open={isRemoveDialogOpen}
        onOpenChange={setIsRemoveDialogOpen}
      />
    </DropdownMenu>
  );
};
