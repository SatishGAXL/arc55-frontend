import { List, Space } from "antd";

/**
 * A component that displays a list of key-value pairs.
 *
 * @param {Object} props - The component props.
 * @param {string} props.title - The title of the list.
 * @param {Array<Object>} props.listData - An array of objects, where each object has a `key` and a `value`.
 * @returns {JSX.Element} - A List component from Ant Design.
 */
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
        <List.Item style={{ justifyContent: "start" }}>
          <Space>
            <b>{item.key}: </b>
            {/* Check if the value is an array */}
            {Array.isArray(item.value) ? (
              <ul>
                {/* If the value is an array, map through it */}
                {item.value.map((val, index) =>
                  // Check if the array element is an object with more than one key
                  Object.keys(val).length > 1 ? (
                    // If it is, map through the keys and display them
                    <li key={index}>
                      {Object.keys(val).map((key) => (
                        <>
                          {`${key}: ${val[key]}`}
                          <br />
                        </>
                      ))}
                    </li>
                  ) : (
                    // If it's not, just display the JSON stringified value
                    <li key={index}>{JSON.stringify(val)}</li>
                  )
                )}
              </ul>
            ) : (
              // If the value is not an array, just display it
              <>{item.value}</>
            )}
          </Space>
        </List.Item>
      )}
    />
  );
};
