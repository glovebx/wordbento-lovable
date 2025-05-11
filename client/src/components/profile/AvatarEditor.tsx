
import { Check } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface AvatarEditorProps {
  avatarSrc: string | null;
  onCancel: () => void;
  onSave: () => void;
}

export const AvatarEditor = ({ avatarSrc, onCancel, onSave }: AvatarEditorProps) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-background rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4">Edit Profile Picture</h3>
        <div className="flex justify-center mb-4">
          <Avatar className="h-32 w-32">
            {avatarSrc && <AvatarImage src={avatarSrc} alt="Preview" />}
          </Avatar>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            <Check className="mr-2 h-4 w-4" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
};
