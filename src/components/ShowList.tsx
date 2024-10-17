import { List,Space } from "antd";
export const ShowList = ({
  title,
  listData,
}: {
  title: string;
  listData: { key: string; value: any }[];
}) => {
  return (
    <List
      size="small"
      header={<h3 style={{ margin: 0, color: "#1677ff" }}>{title}</h3>}
      bordered
      dataSource={listData}
      renderItem={(item) => (
        <List.Item style={{justifyContent:"start"}}>
          <Space><b>{item.key}: </b>
          {Array.isArray(item.value) ? (
            <ul>
              {item.value.map((val, index) =>
                Object.keys(val).length > 1 ? (
                  <li>
                    {Object.keys(val).map((key) => (
                      <>{`${key}: ${val[key]}`}<br/></>
                    ))}
                  </li>
                ) : (
                  <li key={index}>{JSON.stringify(val)}</li>
                )
              )}
            </ul>
          ) : <>{item.value}</>}</Space>
        </List.Item>
      )}
    />
  );
};
