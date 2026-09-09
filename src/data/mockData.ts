export interface ProjectPoint {
  id: string;
  lat: number;
  lng: number;
  sta: string;
  type: "Rekonstruksi" | "Patching" | "Overlay" | "Jembatan";
  progress: number;
  contractor: string;
  status: "Belum Mulai" | "Sedang Berjalan" | "Selesai";
}

export const MOCK_PROJECTS: ProjectPoint[] = [
  {
    "id": "P1",
    "lat": -2.75558538,
    "lng": 103.568636,
    "sta": "1 ",
    "type": "Rekonstruksi",
    "progress": 0,
    "contractor": "PT. Maju Bersama",
    "status": "Belum Mulai"
  },
  {
    "id": "P2",
    "lat": -2.72414282,
    "lng": 103.4612501,
    "sta": "15.9 ",
    "type": "Patching",
    "progress": 58,
    "contractor": "Swakelola",
    "status": "Sedang Berjalan"
  },
  {
    "id": "P3",
    "lat": -2.76381365,
    "lng": 103.3929646,
    "sta": "30.6 ",
    "type": "Overlay",
    "progress": 100,
    "contractor": "PT. Lintas Sumatra",
    "status": "Selesai"
  },
  {
    "id": "P4",
    "lat": -2.84648073,
    "lng": 103.3266095,
    "sta": "2.9 ",
    "type": "Jembatan",
    "progress": 0,
    "contractor": "PT. Bangun Negeri",
    "status": "Belum Mulai"
  },
  {
    "id": "P5",
    "lat": -2.94704378,
    "lng": 103.3050629,
    "sta": "18.3 ",
    "type": "Rekonstruksi",
    "progress": 22,
    "contractor": "PT. Maju Bersama",
    "status": "Sedang Berjalan"
  },
  {
    "id": "P6",
    "lat": -3.02827656,
    "lng": 103.2545726,
    "sta": "33 ",
    "type": "Patching",
    "progress": 100,
    "contractor": "Swakelola",
    "status": "Selesai"
  },
  {
    "id": "P7",
    "lat": -3.09691988,
    "lng": 103.1915853,
    "sta": "47.9 ",
    "type": "Overlay",
    "progress": 0,
    "contractor": "PT. Lintas Sumatra",
    "status": "Belum Mulai"
  },
  {
    "id": "P8",
    "lat": -3.16134852,
    "lng": 103.1096369,
    "sta": "63.1 ",
    "type": "Jembatan",
    "progress": 59,
    "contractor": "PT. Bangun Negeri",
    "status": "Sedang Berjalan"
  }
];
