# DRAX FPS: Đồ họa và cảm giác bắn

Ngày kiểm tra nguồn: 05/09/2026. Các thông số bên dưới là thiết kế của DRAX FPS, không phải bảng damage nguyên bản của CS2/VALORANT.

## Đồ họa kiểu VALORANT có phù hợp web?

Có thể theo hướng mỹ thuật tương tự: hình khối có chủ đích, vật liệu mờ, màu sáng tối dễ phân biệt, ít chi tiết nhiễu trong đường bắn. Không thể suy ra hiệu năng chỉ từ tên phong cách. Độ phức tạp shader, số lần vẽ, bóng động, độ phân giải và kích thước texture mới quyết định phần lớn chi phí.

[Riot - VALORANT Shaders and Gameplay Clarity](https://www.riotgames.com/en/news/valorant-shaders-and-gameplay-clarity) giải thích cách ưu tiên khả năng nhìn rõ mục tiêu, kiểm soát vùng tối và dùng ánh viền cho nhân vật. Áp dụng trong bản này: ánh viền nhỏ theo đội, bề mặt sáng, giảm 10 đèn động ít đóng góp trong cảnh ban ngày; trang trí lặp lại dùng instancing. Hệ thống ánh sáng hiện tại vẫn là Three.js MeshStandardMaterial, không phải shader Gradient Lambert của Riot.

Ba model GLB Kenney và một texture đi kèm khoảng 157 KiB, gồm license. File nhỏ không đồng nghĩa GPU luôn nhẹ: một model nhiều vật liệu vẫn tạo nhiều lần vẽ. Tất cả model mới được lưu trong dự án, không phụ thuộc CDN khi chơi. Art tải bất đồng bộ; đường đi và vật cản có sẵn ngay cả khi tải art thất bại.

Mục tiêu cho bước nâng đồ họa kế tiếp: 60 FPS ở 1080p trên máy mục tiêu đã chọn; giảm số vật liệu NPC/viewmodel và số lượt vẽ trước khi tăng mật độ model. Ưu tiên atlas texture 512-1024, LOD, ánh sáng môi trường tính trước, mesh instancing và ít hậu kỳ. Chỉ dùng texture 2K cho vật thật sự chiếm nhiều diện tích màn hình. Đây là ngân sách đề xuất, chưa phải cam kết hiệu năng cho mọi máy.

Đo nhanh Chromium tự động trên máy hiện tại: 1280×720, High, Sun Relay, đứng tại điểm xuất phát trong 3 giây, 15 mẫu HUD: 169-263 FPS; khoảng 838-874 lượt vẽ và 209-221 nghìn tam giác tính cả shadow/postprocessing. Đây là mẫu ngắn, không phải benchmark GPU phổ quát hoặc kiểm thử laptop yếu. Lượt vẽ còn cao, nên tối ưu batching nhân vật là ưu tiên trước khi thêm model dày đặc.

## Những nguồn đã tham khảo

| Nguồn | Giá trị cho dự án | Quyết định |
| --- | --- | --- |
| [Three.js FPS example](https://github.com/mrdoob/three.js/blob/dev/examples/games_fps.html) | Đọc luồng Capsule/Octree, cập nhật chuyển động và damping theo delta time | Giữ collision hộp hiện tại vì hai map dùng bố cục hộp; dùng suy giảm theo thời gian cho hồi tâm |
| [three-fps - Weapon](https://github.com/mohsenheydari/three-fps/blob/master/src/entities/Player/Weapon.js), [WeaponFSM](https://github.com/mohsenheydari/three-fps/blob/master/src/entities/Player/WeaponFSM.js) | Đọc cách tách idle/shoot/reload, nhịp bắn, muzzle flash, âm thanh và raycast | Tham khảo kiến trúc phản hồi; không nhập nguyên engine hay model súng của repo |
| [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) | Xem acceleratedRaycast, computeBoundsTree, firstHitOnly, yêu cầu hệ tọa độ | Ứng viên khi thay NPC/map bằng mesh nhiều tam giác; chưa thêm dependency trong bản này |
| [Kenney Modular Space Kit](https://kenney.nl/assets/modular-space-kit) | GLB modular, CC0, có texture palette | Đã nhập 3 model, instancing tường biên, cổng và chi tiết mái |
| [Kenney Blaster Kit](https://kenney.nl/assets/blaster-kit) | Nguồn thiết kế súng stylized, CC0 | Ứng viên cho lượt thay model viewmodel, chưa nhập |
| [Quaternius Sci-Fi Modular Guns](https://quaternius.com/packs/scifimodularguns.html) | Các phần súng modular, có định dạng glTF | Nguồn model để đánh giá tiếp; chưa nhập |

## Sentinel và cảm giác bắn

Bản trước dùng vị trí ADS cố định dù scale/core transform mỗi súng khác nhau. Độ giật cộng thẳng vào pitch theo chiều nhìn xuống và không tự hồi. Bản mới căn điểm ngắm theo transform thực của optic; Sentinel có scope 2.7× trùng tâm raycast, tản đạn bằng 0 khi đứng yên ADS. Khi di chuyển vẫn có độ lệch. Recoil là offset riêng, nảy lên và suy giảm theo thời gian, không sửa hướng ngắm gốc do chuột điều khiển.

Mỗi súng có voice âm thanh riêng, lớp crack/body/cơ khí; thêm tiếng xác nhận hạ mục tiêu, vỏ đạn ngắn và hit readout tồn tại 0.8 giây. Click súng bán tự động sớm tối đa khoảng 0.1 giây có bộ đệm; tốc độ bắn tối đa vẫn giữ nguyên.

[Riot - Phantom vs. Vandal](https://playvalorant.com/en-us/news/dev/valorant-data-drop-phantom-vs-vandal/) phân tích ảnh hưởng của vùng trúng, tản đạn và hồi giật lên giao tranh. [VALORANT patch 5.03](https://playvalorant.com/en-gb/news/game-updates/valorant-patch-notes-5-03/) cũng thể hiện chủ đích thưởng độ chính xác khi thay hệ số trúng chân. [Valve - player TraceAttack](https://github.com/ValveSoftware/halflife/blob/master/dlls/player.cpp) là nguồn tham khảo công khai về phân nhóm hitgroup; đây là Half-Life SDK, không phải nguồn CS2 và không được dùng để tuyên bố số damage CS2.

| Vùng trúng | Hệ số DRAX FPS |
| --- | --- |
| Đầu | Ranger 3.5; Specter 3; Sentinel 2.5; Breaker 1.5 trên mỗi viên chùm |
| Ngực | 1.0 |
| Bụng | 1.15 |
| Tay | 0.9 |
| Chân | 0.75 |
| Bàn chân | 0.65 |

Damage = damage cơ bản × suy giảm theo khoảng cách × hệ số vùng. HUD báo lượng HP thực lấy đi, tối đa bằng máu còn lại. Mũ tính là đầu; chưa có hệ thống giáp riêng. Bụng và bàn chân được phân loại bằng tọa độ va chạm trong phần thân/chân đang hoạt ảnh. Vũ khí NPC cầm không tạo hitmarker.

## Bản đồ và kiểm chứng

Iron Divide giữ nhịp ba đường có nhiều vật cản. Sun Relay có sân giữa rộng hơn, tường dọc che hai đường bên, cover lệch đối xứng 180 độ và nhận diện bằng đá cát/xanh trạm năng lượng. Menu có chọn map; đổi map tạo trận mới và lưu lựa chọn.

`npm test`: kiểm tra hai map, mọi điểm hồi sinh nối vào đấu trường, các cover node bot đi tới được; raycast sáu vùng cơ thể, vật cản, bắn hụt, đồng đội, shotgun, recoil hướng lên/hồi tâm. Sentinel được bắn vào đầu/thân tại 30/60/90/120/149 m; ngoài tầm 150 m không gây damage. Build TypeScript/Vite và lint là bước kiểm tra bổ sung. Browser kiểm tra tải model, menu 720p, đổi map và scope; chất lượng cảm giác bắn vẫn cần chơi thử để tinh chỉnh theo sở thích.
