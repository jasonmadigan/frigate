import { baseUrl } from "@/api/baseUrl";
import ExportCard from "@/components/card/ExportCard";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { useSearchEffect } from "@/hooks/use-overlay-state";
import { cn } from "@/lib/utils";
import { DeleteClipType, Export } from "@/types/export";
import { FrigateConfig } from "@/types/frigateConfig";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isMobile } from "react-device-detect";
import { LuFolderX, LuPlus } from "react-icons/lu";
import { toast } from "sonner";
import useSWR from "swr";

function Exports() {
  const { data: exports, mutate } = useSWR<Export[]>("exports");
  const { data: config } = useSWR<FrigateConfig>("config");

  useEffect(() => {
    document.title = "Export - Frigate";
  }, []);

  // Search

  const [search, setSearch] = useState("");

  const filteredExports = useMemo(() => {
    if (!search || !exports) {
      return exports;
    }

    return exports.filter((exp) =>
      exp.name
        .toLowerCase()
        .replaceAll("_", " ")
        .includes(search.toLowerCase()),
    );
  }, [exports, search]);

  // Viewing

  const [selected, setSelected] = useState<Export>();
  const [selectedAspect, setSelectedAspect] = useState(0.0);

  useSearchEffect("id", (id) => {
    if (!exports) {
      return false;
    }

    setSelected(exports.find((exp) => exp.id == id));
    return true;
  });

  // Deleting

  const [deleteClip, setDeleteClip] = useState<DeleteClipType | undefined>();

  const onHandleDelete = useCallback(() => {
    if (!deleteClip) {
      return;
    }

    axios.delete(`export/${deleteClip.file}`).then((response) => {
      if (response.status == 200) {
        setDeleteClip(undefined);
        mutate();
      }
    });
  }, [deleteClip, mutate]);

  // Create Export Dialog
  const [showCreateExport, setShowCreateExport] = useState(false);
  const [exportCamera, setExportCamera] = useState<string>("");
  const [exportName, setExportName] = useState("");
  const [exportMode, setExportMode] = useState<"realtime" | "timelapse_25x">(
    "realtime",
  );
  const [exportStartTime, setExportStartTime] = useState("");
  const [exportEndTime, setExportEndTime] = useState("");

  const onCreateExport = useCallback(() => {
    if (!exportCamera || !exportStartTime || !exportEndTime) {
      toast.error("Please fill in all required fields", {
        position: "top-center",
      });
      return;
    }

    const startTimestamp = new Date(exportStartTime).getTime() / 1000;
    const endTimestamp = new Date(exportEndTime).getTime() / 1000;

    if (endTimestamp <= startTimestamp) {
      toast.error("End time must be after start time", {
        position: "top-center",
      });
      return;
    }

    axios
      .post(
        `export/${exportCamera}/start/${Math.round(startTimestamp)}/end/${Math.round(endTimestamp)}`,
        {
          playback: exportMode,
          name: exportName,
        },
      )
      .then((response) => {
        if (response.status == 200) {
          toast.success(
            "Successfully started export. View the file in the /exports folder.",
            { position: "top-center" },
          );
          setShowCreateExport(false);
          setExportName("");
          setExportStartTime("");
          setExportEndTime("");
          setExportMode("realtime");
          mutate();
        }
      })
      .catch((error) => {
        if (error.response?.data?.message) {
          toast.error(
            `Failed to start export: ${error.response.data.message}`,
            { position: "top-center" },
          );
        } else {
          toast.error(`Failed to start export: ${error.message}`, {
            position: "top-center",
          });
        }
      });
  }, [
    exportCamera,
    exportStartTime,
    exportEndTime,
    exportMode,
    exportName,
    mutate,
  ]);

  // Renaming

  const onHandleRename = useCallback(
    (id: string, update: string) => {
      axios
        .patch(`export/${id}/${encodeURIComponent(update)}`)
        .then((response) => {
          if (response.status == 200) {
            setDeleteClip(undefined);
            mutate();
          }
        })
        .catch((error) => {
          if (error.response?.data?.message) {
            toast.error(
              `Failed to rename export: ${error.response.data.message}`,
              { position: "top-center" },
            );
          } else {
            toast.error(`Failed to rename export: ${error.message}`, {
              position: "top-center",
            });
          }
        });
    },
    [mutate],
  );

  return (
    <div className="flex size-full flex-col gap-2 overflow-hidden px-1 pt-2 md:p-2">
      <Toaster closeButton={true} />

      <AlertDialog
        open={deleteClip != undefined}
        onOpenChange={() => setDeleteClip(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Export</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteClip?.exportName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              className="text-white"
              aria-label="Delete Export"
              variant="destructive"
              onClick={() => onHandleDelete()}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={selected != undefined}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(undefined);
          }
        }}
      >
        <DialogContent
          className={cn("max-w-[80%]", isMobile && "landscape:max-w-[60%]")}
        >
          <DialogTitle className="capitalize">
            {selected?.name?.replaceAll("_", " ")}
          </DialogTitle>
          <video
            className={cn(
              "size-full rounded-lg md:rounded-2xl",
              selectedAspect < 1.5 && "aspect-video h-full",
            )}
            playsInline
            preload="auto"
            autoPlay
            controls
            muted
            onLoadedData={(e) =>
              setSelectedAspect(
                e.currentTarget.videoWidth / e.currentTarget.videoHeight,
              )
            }
          >
            <source
              src={`${baseUrl}${selected?.video_path?.replace("/media/frigate/", "")}`}
              type="video/mp4"
            />
          </video>
        </DialogContent>
      </Dialog>

      {exports && (
        <div className="flex w-full items-center justify-center gap-2 p-2">
          <Input
            className="text-md w-full bg-muted md:w-1/3"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            onClick={() => {
              const now = new Date();
              const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
              setExportStartTime(oneHourAgo.toISOString().slice(0, 16));
              setExportEndTime(now.toISOString().slice(0, 16));
              setShowCreateExport(true);
            }}
            size="sm"
            className="flex items-center gap-1"
          >
            <LuPlus className="size-4" />
            Create Export
          </Button>
        </div>
      )}

      <Dialog open={showCreateExport} onOpenChange={setShowCreateExport}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Export</DialogTitle>
            <DialogDescription>
              Create a new video export from your recordings
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="camera" className="text-right">
                Camera
              </Label>
              <Select value={exportCamera} onValueChange={setExportCamera}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a camera" />
                </SelectTrigger>
                <SelectContent>
                  {config?.cameras &&
                    Object.keys(config.cameras).map((camera) => (
                      <SelectItem key={camera} value={camera}>
                        {camera}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startTime" className="text-right">
                Start Time
              </Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={exportStartTime}
                onChange={(e) => setExportStartTime(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endTime" className="text-right">
                End Time
              </Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={exportEndTime}
                onChange={(e) => setExportEndTime(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="pt-2 text-right">Export Mode</Label>
              <RadioGroup
                value={exportMode}
                onValueChange={(value) =>
                  setExportMode(value as "realtime" | "timelapse_25x")
                }
                className="col-span-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="realtime" id="realtime" />
                  <Label htmlFor="realtime" className="cursor-pointer">
                    Realtime
                    <span className="ml-2 text-xs text-muted-foreground">
                      Original speed
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="timelapse_25x" id="timelapse_25x" />
                  <Label htmlFor="timelapse_25x" className="cursor-pointer">
                    Timelapse (25x)
                    <span className="ml-2 text-xs text-muted-foreground">
                      25x speed, no audio
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={exportName}
                onChange={(e) => setExportName(e.target.value)}
                placeholder="Optional export name"
                className="col-span-3"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateExport(false)}
            >
              Cancel
            </Button>
            <Button onClick={onCreateExport}>Create Export</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="w-full overflow-hidden">
        {exports && filteredExports && filteredExports.length > 0 ? (
          <div className="scrollbar-container grid size-full gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Object.values(exports).map((item) => (
              <ExportCard
                key={item.name}
                className={
                  search == "" || filteredExports.includes(item) ? "" : "hidden"
                }
                exportedRecording={item}
                onSelect={setSelected}
                onRename={onHandleRename}
                onDelete={({ file, exportName }) =>
                  setDeleteClip({ file, exportName })
                }
              />
            ))}
          </div>
        ) : (
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
            <LuFolderX className="size-16" />
            No exports found
          </div>
        )}
      </div>
    </div>
  );
}

export default Exports;
