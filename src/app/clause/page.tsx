import Navbarcomponent from "@/components/navbar/Navbar";
import React from "react";
import Link from 'next/link';

function page() {
  return (
    <div>
      <div className="h-16">
        <Navbarcomponent />
      </div>
      <div className="mx-auto w-[94%] lg:w-[80%]">
        <h1 className="text-3xl font-bold mt-4 md:mt-8">Điều khoản - Miễn trừ trách nhiệm</h1>
        <p className="mt-4 text-[#bdbdbd]">
        Animeflix cam kết tôn trọng quyền sở hữu trí tuệ của người khác và tuân thủ Đạo luật Bản quyền Thiên niên kỷ Kỹ thuật số (DMCA).
        Chúng tôi coi trọng việc vi phạm bản quyền và sẽ phản hồi các thông báo vi phạm bản quyền có ý nghĩa tuân thủ DMCA và bất kỳ luật hiện hành nào khác.
        </p>

        <p className="mt-4 text-[#bdbdbd]">
        Nếu bạn tin rằng bất kỳ nội dung nào trên trang web của chúng tôi vi phạm bản quyền của bạn,
        vui lòng gửi email cho chúng tôi. Vui lòng chờ tối đa 2-5 ngày làm việc để nhận được phản hồi. 
        Xin lưu ý rằng việc gửi email khiếu nại của bạn đến các bên khác, chẳng hạn như Nhà cung cấp dịch vụ Internet, 
        Nhà cung cấp dịch vụ lưu trữ và các bên thứ ba khác, sẽ không đẩy nhanh yêu cầu của bạn và có thể dẫn đến việc phản hồi bị chậm trễ do khiếu nại không được nộp đúng cách.
        </p>

        <div className="flex flex-col gap-4 my-4">
          <p className="lg:text-xl font-medium">
            Để chúng tôi có thể xử lý khiếu nại của bạn, vui lòng cung cấp những thông tin sau:
          </p>
          <div className="ml-5">
            <ul className="flex flex-col gap-2 list-disc text-[#bdbdbd]">
              <li>
                Mô tả về tác phẩm có bản quyền mà bạn cho là đang bị vi phạm;
              </li>
              <li>
                Mô tả về tài liệu mà bạn cho là vi phạm và
                bạn muốn xóa hoặc vô hiệu hóa quyền truy cập vào tài liệu đó bằng URL
                và bằng chứng bạn là chủ sở hữu ban đầu hoặc vị trí khác của
                tài liệu đó;
              </li>
              <li>
                Tên của bạn, chức vụ (nếu đại diện), địa chỉ, số điện thoại
                và địa chỉ email;
              </li>
              <li>
                Tuyên bố sau đây:{" "}
                "Tôi hoàn toàn tin tưởng rằng việc sử dụng tài liệu có bản quyền
                mà tôi đang khiếu nại là không được chủ sở hữu bản quyền, đại diện của chủ sở hữu bản quyền hoặc luật pháp cho phép (ví dụ: sử dụng hợp lý)";
              </li>
              <li>
                Tuyên bố sau đây:{" "}
                "Thông tin trong thông báo này là chính xác và, dưới hình phạt
                của việc khai man, tôi là chủ sở hữu, hoặc được ủy quyền hành động thay mặt
                cho chủ sở hữu, của bản quyền hoặc quyền độc quyền mà
                bị cáo buộc vi phạm";
              </li>
              <li>
                Tuyên bố sau đây:{" "}
                "Tôi hiểu rằng tôi có thể bị kiện nếu
                gửi yêu cầu DMCA mà không có bằng chứng xác đáng.";
              </li>
              <li>
                Chữ ký điện tử hoặc chữ ký trực tiếp của chủ sở hữu bản quyền hoặc người được ủy quyền hành động thay mặt chủ sở hữu.
              </li>
            </ul>
          </div>
        </div>

        <h2 className="text-2xl font-bold mt-8">Chú ý:</h2>
        <p className="mt-4 text-[#bdbdbd]">
            Không có tệp nào được liệt kê trên Animeflix được lưu trữ trên máy chủ của chúng tôi. Tất cả
            liên kết đều trỏ đến nội dung được lưu trữ trên các trang web của bên thứ ba. Animeflix
            không chịu trách nhiệm về nội dung được lưu trữ trên các trang web của bên thứ ba
            và không tham gia vào việc tải xuống/tải lên phim. Chúng tôi chỉ
            đăng các liên kết có sẵn trên internet. Nếu bạn tin rằng bất kỳ
            nội dung nào trên trang web của chúng tôi vi phạm quyền sở hữu trí tuệ
            của bạn và bạn nắm giữ bản quyền đối với nội dung đó, vui lòng báo cáo
            cho {" "}
          <Link href="mailto:duynguyen19087@gmail.com" className="text-white">
            duynguyen19087@gmail.com
          </Link>{" "}
          và nội dung sẽ bị xóa ngay lập tức.
        </p>
      </div>
    </div>
  );
}

export default page;